const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Board = require('../models/Board');
const User = require('../models/User');


router.post('/add', auth, async (req, res) => {
    const { boardId, userEmail } = req.body;


    const userToAdd = await User.findOne({ email: userEmail });
    if (!userToAdd) return res.status(404).send("User not found.");

    const board = await Board.findByIdAndUpdate(
        boardId,
        { $addToSet: { members: userToAdd._id } },
        { new: true }
    ).populate('members', 'name email');

    res.send({ message: "Collaborator added", members: board.members });
});


router.post('/remove', auth, async (req, res) => {
    const { boardId, userId } = req.body;

    const board = await Board.findByIdAndUpdate(
        boardId,
        { $pull: { members: userId } },
        { new: true }
    );

    res.send({ message: "Collaborator removed", members: board.members });
});

module.exports = router;