import mongoose from "mongoose";


const checklistSchema = new mongoose.Schema({
    title: { type: String, required: true },
    isCompleted: { type: Boolean, default: false },
});

const cardSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: "" },
    listId: { type: mongoose.Schema.Types.ObjectId, ref: 'List', required: true },
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    checklists: [checklistSchema],
    active: {
        type: Boolean, default
            : false
    },
    order: { type: Number, default: 0 }
}, { timestamps: true });

const Card = mongoose.model('Card', cardSchema);
export default Card;