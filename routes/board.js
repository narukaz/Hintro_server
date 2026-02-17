const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Board = require('../models/Board');
const List = require('../models/List');
const Card = require('../models/Card');


router.post('/:boardId/member', auth, async (req, res) => {
    await Board.findByIdAndUpdate(req.params.boardId, { $push: { members: req.body.userId } });
    res.send("Member added");
});


router.post('/:boardId/list', auth, async (req, res) => {
    const list = new List({ title: req.body.title, boardId: req.params.boardId });
    await list.save();
    res.send(list);
});

router.patch('/list/:listId', auth, async (req, res) => {
    const list = await List.findByIdAndUpdate(req.params.listId, { title: req.body.title }, { new: true });
    res.send(list);
});


router.post('/list/:listId/card', auth, async (req, res) => {
    const card = new Card({ ...req.body, listId: req.params.listId });
    await card.save();
    res.send(card);
});


router.patch('/card/:cardId/move', auth, async (req, res) => {
    const { newListId, newOrder } = req.body;
    const card = await Card.findByIdAndUpdate(req.params.cardId, {
        listId: newListId,
        order: newOrder
    }, { new: true });
    res.send(card);
});

export default router;