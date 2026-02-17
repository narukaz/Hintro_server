import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({

    card: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Card',
        required: true
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: String,
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;