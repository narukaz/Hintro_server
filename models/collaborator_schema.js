import mongoose from "mongoose";



const collaboratorSchema = new mongoose.Schema({
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['editor', 'viewer'], default: 'editor' },
    addedAt: { type: Date, default: Date.now }
});

const Collaborator = mongoose.model('Collaborator', collaboratorSchema);
export default Collaborator;