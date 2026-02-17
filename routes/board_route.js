import express from "express";
import Board from "../models/board_schema.js";
import verifyToken from "../utils/middleware.js";
import List from "../models/list_schema.js";
import Card from "../models/card_schema.js";
import Acitivity from "../models/activity_schema.js";
import collaborator_schema from "../models/collaborator_schema.js";
import User from "../models/user_schema.js";
import Notification from "../models/notification_schema.js";
const route = express.Router();


route.get("/my-boards", verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // 1. Find boards where I am the owner
        const ownedBoards = await Board.find({ owner: userId });

        // 2. Find collaborator entries where I have been added (and accepted)
        // Ensure your collaborator_schema has { boardId, userId }
        const collaborations = await collaborator_schema.find({ userId })
            .populate('boardId');

        // 3. Extract the actual board objects from collaborations
        const collabBoards = collaborations
            .filter(c => c.boardId) // Filter out nulls if a board was deleted
            .map(c => c.boardId);

        // 4. Combine and mark ownership
        const enrichedOwned = ownedBoards.map(b => ({
            ...b.toObject(),
            isOwner: true
        }));

        const enrichedCollab = collabBoards.map(b => ({
            ...b.toObject(),
            isOwner: false
        }));

        // Combine into one list
        const allBoards = [...enrichedOwned, ...enrichedCollab];

        res.json(allBoards);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// PATCH /notifications/:notifId/accept


route.get("/:id", verifyToken, async (req, res) => {
    try {
        const boardId = req.params.id;
        const INITIAL_LIMIT = 10; // Only send 10 cards per list initially

        const [board, lists] = await Promise.all([
            Board.findById(boardId).populate("members", "name email"),
            List.find({ boardId }).sort({ order: 1 })
        ]);

        if (!board) return res.status(404).json({ message: "Board not found" });

        // Fetch all cards but we will manually slice them per list for the initial state
        const allCards = await Card.find({ boardId })
            .sort({ order: 1 })
            .populate("assignedTo", "name email");

        const boardData = lists.map(list => {
            const listCards = allCards.filter(card => card.listId.toString() === list._id.toString());

            return {
                _id: list._id,
                title: list.title,
                order: list.order,
                tasks: listCards.slice(0, INITIAL_LIMIT),
                // Metadata for frontend to handle pagination
                hasMore: listCards.length > INITIAL_LIMIT,
                totalCards: listCards.length,
                currentPage: 1
            };
        });

        res.json({
            board,
            lists: boardData
            // Removed activities as per request
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

route.post('/:boardId/invite', verifyToken, async (req, res) => {
    try {
        const { boardId } = req.params;
        const { email } = req.body;
        const senderId = req.user.userId;

        // 1. Search for the user by the provided email
        const recipient = await User.findOne({ email: email.toLowerCase().trim() });
        if (!recipient) {
            return res.status(404).json({ message: "User not found. Ask them to sign up first!" });
        }

        // 2. Prevent self-invitation
        if (recipient._id.toString() === senderId) {
            return res.status(400).json({ message: "You are already the owner of this board." });
        }

        // 3. Check if they are already a collaborator
        const alreadyCollab = await collaborator_schema.findOne({
            boardId,
            userId: recipient._id
        });
        if (alreadyCollab) {
            return res.status(400).json({ message: "This user is already a collaborator on this board." });
        }

        // 4. Check for an existing pending invitation
        const existingInvite = await Notification.findOne({
            boardId,
            recipientId: recipient._id,
            status: 'pending'
        });

        if (existingInvite) {
            return res.status(400).json({ message: "An invitation is already pending for this email." });
        }

        // 5. Fetch Board and Sender details for a rich notification message
        const [board, sender] = await Promise.all([
            Board.findById(boardId),
            User.findById(senderId)
        ]);

        if (!board) return res.status(404).json({ message: "Board not found." });

        // 6. Generate the Notification Object
        const newNotification = new Notification({
            recipientId: recipient._id, // Found via email search
            senderId: senderId,
            boardId: boardId,
            type: 'BOARD_INVITE',
            // Personalized message using sender and board data
            message: `${sender.name} invited you to collaborate on the board: "${board.title}"`,
            status: 'pending'
        });

        await newNotification.save();
        req.io.emit("SYNC_NOTIFICATIONS");

        res.status(200).json({
            message: "Invitation sent!",
            recipientName: recipient.name
        });

    } catch (error) {
        console.error("Invite Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
route.post("/", verifyToken, async (req, res) => {
    try {
        const { title } = req.body;
        const newBoard = new Board({
            title,
            owner: req.user.userId,
            members: []
        });

        const savedBoard = await newBoard.save();
        const defaultLists = ["Backlog", "Processing", "Finished"];

        await Promise.all(defaultLists.map((title, index) => {
            return List.create({
                title: title,
                boardId: savedBoard._id,
                order: index
            });
        }));
        res.status(201).json(savedBoard);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});


route.put("/:id", verifyToken, async (req, res) => {
    try {
        const updatedBoard = await Board.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedBoard);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});


route.delete("/:id", verifyToken, async (req, res) => {
    try {
        await Board.findByIdAndDelete(req.params.id);
        res.json({ message: "board deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default route;



