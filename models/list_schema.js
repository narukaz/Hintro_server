import mongoose from "mongoose";
const listSchema = new mongoose.Schema({
    title: { type: String, required: true },
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    order: { type: Number, default: 0 }
});

const List = mongoose.model('List', listSchema);
export default List;