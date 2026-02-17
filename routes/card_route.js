import express from "express";
import Card from "../models/card_schema.js";
import Board from "../models/board_schema.js";
import verifyToken from "../utils/middleware.js";
import User from "../models/user_schema.js";
import Comment from "../models/comment_schema.js";
import Activity from "../models/activity_schema.js";
import Assignment from "./assignment_schema.js";
import Notification from "../models/notification_schema.js";


const route = express.Router();


const createActivityLog = async (boardId, cardId, userId, action, details = {}) => {
    try {
        await Activity.create({ boardId, cardId, userId, action, details });
    } catch (err) {
        console.error("Logging Error:", err);
    }
};


route.post('/:cardId/assign', verifyToken, async (req, res) => {
    try {
        const { email } = req.body;
        const { cardId } = req.params;

        // 1. Find the user being assigned
        const userToAssign = await User.findOne({ email });
        if (!userToAssign) return res.status(404).json({ message: "User not found" });

        const card = await Card.findById(cardId);

        // 2. Prevent duplicate assignment
        const existing = await Assignment.findOne({ cardId, userId: userToAssign._id });
        if (existing) return res.status(400).json({ message: "User already assigned" });

        // 3. Create Assignment
        const newAssignment = new Assignment({
            cardId,
            boardId: card.boardId,
            userId: userToAssign._id,
            assignedBy: req.user.userId
        });
        await newAssignment.save();

        // 4. Create a "Passive" Notification (No accept/decline needed)
        const notification = new Notification({
            recipientId: userToAssign._id,
            senderId: req.user.userId,
            boardId: card.boardId,
            type: 'TASK_ASSIGNED',
            message: `assigned you to task: "${card.title}"`,
            status: 'read' // Mark as read or similar since no action is required
        });
        await notification.save();

        // 5. Trigger Socket for real-time red dot
        req.io.emit("SYNC_NOTIFICATIONS");

        res.status(200).json({ message: "Task assigned successfully", user: userToAssign });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

route.patch("/update-status/:id", verifyToken, async (req, res) => {
    try {
        const { active, socketId } = req.body; // Expect socketId from frontend
        const cardId = req.params.id;

        const updatedCard = await Card.findByIdAndUpdate(
            cardId,
            { $set: { active: active } },
            { new: true }
        );

        if (!updatedCard) return res.status(404).json({ message: "Card not found." });

        await createActivityLog(updatedCard.boardId, cardId, req.user.userId, 'MARKED COMPLETE', { status: active });

        // EMIT STATUS UPDATE
        req.io.to(updatedCard.boardId.toString()).emit("CARD_STATUS_UPDATED", {
            cardId: updatedCard._id,
            active: updatedCard.active,
            socketId: socketId // Pass back the sender's ID
        });

        res.status(200).json(updatedCard);
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
});
route.get("/search", verifyToken, async (req, res) => {
    const { q } = req.query;
    try {
        const users = await User
            .find({
                name: { $regex: q, $options: 'i' }
            }).limit(5).select("name email _id");
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
route.post("/create", verifyToken, async (req, res) => {
    try {
        // 1. Pull socketId from the body
        const { title, listId, boardId, order, socketId } = req.body;

        const boardExists = await Board.exists({ _id: boardId });
        if (!boardExists) return res.status(404).json({ message: "Board not found" });

        const newCard = new Card({ title, listId, boardId, order: order || 0 });
        const savedCard = await newCard.save();

        const log = await createActivityLog(
            boardId,
            savedCard._id,
            req.user.userId,
            'CREATE_CARD',
            { title }
        );

        // 2. Include socketId in the broadcast
        req.io.to(boardId.toString()).emit("CARD_CREATED", {
            newCard: savedCard,
            activity: log,
            senderId: req.user.userId,
            socketId: socketId // Pass it back to the frontend
        });

        res.status(201).json(savedCard);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});
route.put("/update/:id", verifyToken, async (req, res) => {
    try {
        const cardBeforeUpdate = await Card.findById(req.params.id);

        const updatedCard = await Card.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        ).populate('assignedTo', 'name email');

        // 1. LOG: Title updates
        if (req.body.title && req.body.title !== cardBeforeUpdate.title) {
            await createActivityLog(updatedCard.boardId, updatedCard._id, req.user.userId, 'UPDATE_CARD_TITLE', { newTitle: req.body.title });
        }

        // 2. LOG: Description updates
        if (req.body.description && req.body.description !== cardBeforeUpdate.description) {
            await createActivityLog(updatedCard.boardId, updatedCard._id, req.user.userId, 'UPDATE_CARD_DESC');
        }

        // 3. LOG: Checklist updates (Detecting changes in the checklist array)
        if (req.body.checklists) {
            const oldLen = cardBeforeUpdate.checklists.length;
            const newLen = req.body.checklists.length;

            if (newLen > oldLen) {
                // Item added
                const newItem = req.body.checklists[newLen - 1];
                await createActivityLog(updatedCard.boardId, updatedCard._id, req.user.userId, 'ADD_CHECKLIST_ITEM', { itemTitle: newItem.title });
            } else if (newLen === oldLen) {
                // Item toggled (Check if any isCompleted status changed)
                const changedItem = req.body.checklists.find((item, idx) =>
                    item.isCompleted !== cardBeforeUpdate.checklists[idx]?.isCompleted
                );

                if (changedItem) {
                    await createActivityLog(updatedCard.boardId, updatedCard._id, req.user.userId, 'TOGGLE_CHECKLIST_ITEM', {
                        itemTitle: changedItem.title,
                        isCompleted: changedItem.isCompleted
                    });
                }
            }
        }

        res.json(updatedCard);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});
route.get("/:id/comments", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Fetch comments and populate user details
        const comments = await Comment.find({ card: id })
            .sort({ createdAt: -1 })
            .populate("user", "name");

        // 2. Identify the current logged-in user from the token
        const currentUserId = req.user.userId || req.user._id;

        // 3. Add the 'isMine' flag to each comment
        const commentsWithPermissions = comments.map(comment => {

            const commentObj = comment.toObject();



            commentObj.isMine = comment.user && comment.user._id.toString() === currentUserId.toString();

            return commentObj;
        });

        res.json(commentsWithPermissions);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching comments",
            error: error.message
        });
    }
});
route.post("/:id/comment", verifyToken, async (req, res) => {
    try {
        const { text, socketId } = req.body; // Receive socketId from frontend
        const cardId = req.params.id;
        const card = await Card.findById(cardId);

        const newComment = await Comment.create({
            card: cardId,
            user: req.user.userId,
            userName: req.user.name || "User",
            text: text
        });

        await createActivityLog(card.boardId, cardId, req.user.userId, 'ADD_COMMENT', { textSnippet: text.substring(0, 20) });

        // EMIT EVENT: Tell everyone in the board room about the new comment
        req.io.to(card.boardId.toString()).emit("COMMENT_ADDED", {
            cardId: cardId,
            newComment: newComment,
            socketId: socketId // Pass this back to identify the sender
        });

        res.status(201).json(newComment);
    } catch (error) {
        res.status(400).json({ message: "Failed to add comment", error: error.message });
    }
});

route.delete("/delete/:id", verifyToken, async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);
        if (card) {
            const boardId = card.boardId.toString();

            await createActivityLog(boardId, card._id, req.user.userId, 'DELETE_CARD', { title: card.title });
            await Card.findByIdAndDelete(req.params.id);

            // EMIT SOCKET EVENT
            // We send the socketId from the headers or query if provided by frontend
            const senderSocketId = req.headers['x-socket-id'];
            req.io.to(boardId).emit("CARD_DELETED", {
                cardId: req.params.id,
                socketId: senderSocketId
            });
        }
        res.json({ message: "Card deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
route.get("/:id/activities", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch activities for this card, populate user details to show who did it
        const activities = await Activity.find({ cardId: id })
            .sort({ timestamp: -1 }) // Show newest first
            .populate("userId", "name"); // Link to User schema to get names

        res.json(activities);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching activities",
            error: error.message
        });
    }
});
route.patch("/move/:id", verifyToken, async (req, res) => {
    try {
        const { newListId, newOrder } = req.body;
        const cardId = req.params.id;
        const card = await Card.findById(cardId);
        if (!card) return res.status(404).json({ message: "Card not found" });

        const oldListId = card.listId;
        const oldOrder = card.order;

        // Logic for reordering within the same list or moving to a new list
        if (oldListId.toString() === newListId) {
            if (newOrder > oldOrder) {
                await Card.updateMany({ listId: oldListId, order: { $gt: oldOrder, $lte: newOrder } }, { $inc: { order: -1 } });
            } else if (newOrder < oldOrder) {
                await Card.updateMany({ listId: oldListId, order: { $gte: newOrder, $lt: oldOrder } }, { $inc: { order: 1 } });
            }
        } else {
            await Card.updateMany({ listId: oldListId, order: { $gt: oldOrder } }, { $inc: { order: -1 } });
            await Card.updateMany({ listId: newListId, order: { $gte: newOrder } }, { $inc: { order: 1 } });
        }

        card.listId = newListId;
        card.order = newOrder;
        await card.save();

        // 1. UTILIZE SCHEMA: Save the activity log
        const log = await createActivityLog(
            card.boardId,
            cardId,
            req.user.userId,
            'MOVE_CARD',
            { fromList: oldListId, toList: newListId, cardTitle: card.title }
        );

        // 2. UTILIZE IO: Emit the change to everyone in the board room
        // req.io was attached in your index.js middleware
        req.io.to(card.boardId.toString()).emit("CARD_MOVED", {
            cardId: cardId,
            fromListId: oldListId,
            toListId: newListId,
            newOrder: newOrder,
            senderId: req.user.userId, // Helps frontend avoid moving the card twice for the sender
            activity: log // Send the log so others see the "User moved X to Y" notification
        });

        res.status(200).json({ message: "Order updated successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

route.get("/search/:boardId", verifyToken, async (req, res) => {
    try {
        const { boardId } = req.params;
        const query = req.query.q;

        if (!query) return res.json([]);

        // Case-insensitive regex for the search term
        const searchRegex = { $regex: query, $options: "i" };

        // Requirement: Deep search across multiple fields
        const results = await Card.find({
            boardId: boardId,
            $or: [
                { title: searchRegex },
                { description: searchRegex },
                { "checkboxes.title": searchRegex } // Searches inside the array of subtasks
            ]
        })
            .populate("assignedTo", "name email")
            .limit(20);

        res.json(results);
    } catch (error) {
        res.status(500).json({ status: "failed", message: error.message });
    }
});
export default route;