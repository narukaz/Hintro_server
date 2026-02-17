// models/assignment_schema.js
import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
    cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: true },
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export default mongoose.model("Assignment", assignmentSchema);