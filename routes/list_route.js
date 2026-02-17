import express from "express";
import List from "../models/list_schema.js";
import Board from "../models/board_schema.js";
import Card from "../models/card_schema.js";

const route = express.Router();


route.get("/board/:boardId", async (req, res) => {
    console.log("request id", req.params.id
    )
    try {
        const lists = await List.find({ boardId: req.params.boardId }).sort("order");
        res.json(lists);
    } catch (error) {
        res.status(500).json({ status: "failed", message: error.message });
    }
});


route.post("/create", async (req, res) => {
    try {
        const { title, boardId, order } = req.body;


        const board = await Board.findById(boardId);
        if (!board) return res.status(404).json({ message: "Board not found" });

        const newList = await List.create({ title, boardId, order });
        res.status(201).json(newList);
    } catch (error) {
        res.status(400).json({ status: "failed", message: error.message });
    }
});


route.put("/update/:id", async (req, res) => {
    try {
        const updatedList = await List.findByIdAndUpdate(
            req.params.id,
            { title: req.body.title },
            { new: true }
        );
        res.json(updatedList);
    } catch (error) {
        res.status(400).json({ status: "failed", message: error.message });
    }
});


route.patch("/reorder", async (req, res) => {
    try {
        const { listOrders } = req.body;

        const updatePromises = listOrders.map((item) =>
            List.findByIdAndUpdate(item.id, { order: item.order })
        );

        await Promise.all(updatePromises);
        res.json({ status: "success", message: "Lists reordered" });
    } catch (error) {
        res.status(500).json({ status: "failed", message: error.message });
    }
});

route.get("/:listId/cards", async (req, res) => {
    try {
        const { listId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Fetch cards for this specific list with pagination
        const [cards, totalCount] = await Promise.all([
            Card.find({ listId })
                .sort({ order: 1 })
                .populate("assignedTo", "name email") // Requirement: Assign users to tasks [cite: 11]
                .skip(skip)
                .limit(limit),
            Card.countDocuments({ listId })
        ]);

        res.json({
            cards,
            currentPage: page,
            hasMore: skip + cards.length < totalCount,
            totalCards: totalCount
        });
    } catch (error) {
        res.status(500).json({ status: "failed", message: error.message });
    }
});


route.delete("/delete/:id", async (req, res) => {
    try {

        await List.findByIdAndDelete(req.params.id);
        res.json({ status: "success", message: "List deleted" });
    } catch (error) {
        res.status(500).json({ status: "failed", message: error.message });
    }
});

export default route;