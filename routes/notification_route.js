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
route.patch('/:notifId/accept', verifyToken, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.notifId);
        if (!notification) return res.status(404).json({ message: "Not found" });

        notification.status = 'accepted';
        await notification.save();

        await new collaborator_schema({
            boardId: notification.boardId,
            userId: req.user.userId,
            role: 'editor'
        }).save();

        // THE SHORTCUT: Tell everyone in the board room to refresh
        req.io.to(notification.boardId.toString()).emit("SYNC_NOTIFICATIONS");

        res.status(200).json({ message: "Joined board successfully!" });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

route.get('/my-invites', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const notifications = await Notification.find({
            recipientId: userId,
            status: 'pending'
        })
            .populate('senderId', 'name email')
            .populate('boardId', 'title')
            .sort({ createdAt: -1 });


        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: "Error fetching notifications" });
    }
});

// PATCH /notifications/:notifId/decline
route.patch('/:notifId/decline', verifyToken, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.notifId);
        if (!notification) return res.status(404).json({ message: "Not found" });

        notification.status = 'declined';
        await notification.save();

        // THE SHORTCUT: Tell everyone in the board room to refresh
        req.io.emit("SYNC_NOTIFICATIONS");

        res.status(200).json({ message: "Invitation declined." });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

route.get('/sent-updates', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Find notifications where you are the sender AND:
        // EITHER it's an invite that was acted upon
        // OR it's a task assignment you made
        const updates = await Notification.find({
            senderId: userId,
            $or: [
                { status: { $in: ['accepted', 'declined'] } },
                { type: 'TASK_ASSIGNED' }
            ]
        })
            .populate('recipientId', 'name email')
            .populate('boardId', 'title')
            .sort({ updatedAt: -1 }) // Assignments and acted-on invites will appear chronologically
            .limit(20); // Increased limit slightly to accommodate both types

        res.status(200).json(updates);
    } catch (error) {
        res.status(500).json({ message: "Error fetching invite updates" });
    }
});

export default route