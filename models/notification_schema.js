import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    type: { type: String, default: 'BOARD_INVITE' },
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'read'], default: 'pending' },
    message: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification