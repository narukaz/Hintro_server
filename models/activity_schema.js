import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
    boardId: { type: mongoose.Types.ObjectId, ref: 'Board', required: true },
    cardId: { type: mongoose.Types.ObjectId, ref: 'Card' },
    userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    action: {
        type: String,
        enum: [
            'CREATE_CARD',
            'MOVE_CARD',
            'UPDATE_CARD_TITLE',
            'UPDATE_CARD_DESC',
            'DELETE_CARD',
            'TOGGLE_CHECKLIST_ITEM',
            "ADD_CHECKLIST_ITEM",
            'ADD_COMMENT',
            "MARKED COMPLETE"
        ],
        required: true
    },
    details: { type: Object },
    timestamp: { type: Date, default: Date.now }
});

const Activity = mongoose.model('activites', activitySchema);
export default Activity;