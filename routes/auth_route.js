import express from "express"
const router = express.Router();
import User from "../models/user_schema.js"
import jwt from "jsonwebtoken";
import bycrypt from "bcrypt";
import Board from "../models/board_schema.js"
import verifyToken from "../utils/middleware.js";
import List from "../models/list_schema.js";
router.get("verify", verifyToken, async (_, res) => {
    res.status(200).json({ status: "success", message: "token exists" })
})
router.post("/signup", async (req, res) => {
    try {

        let { email, password, name } = req.body;
        if (!email) {
            return res.status(400).json({ status: "failed", message: "email missing" })
        }
        if (!name) {
            return res.status(400).json({ status: "failed", message: "name missing" })
        }
        if (!password) {
            return res.status(400).json({ status: "failed", message: "password missing" })
        }
        let find_user = await User.findOne({ email });

        if (find_user) {
            return res.status(409).json({ stats: "failed", message: "Account already exist" })
        }
        const salt = await bycrypt.genSalt(10);
        const hash = await bycrypt.hash(password, salt);

        let write_user = await User.insertOne({
            email, password: hash, name
        })
        let create_board = await Board.insertOne({
            title: "task",
            members: [],
            owner: write_user._id
        })
        if (!create_board) {
            console.log("deafult board creation failed")
        }
        const defaultLists = ["Backlog", "Processing", "Finished"];

        await Promise.all(defaultLists.map((title, index) => {
            return List.create({
                title: title,
                boardId: create_board._id,
                order: index
            });
        }));

        if (write_user) {
            return res.status(200).json({ status: "success", message: "signup complete successfully" })
        }
    } catch (error) {
        console.log("at signup ", error)
        return res.status(500).json({ status: "failed", message: "internal server error" })
    }


});
router.post("/signin", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email) {
            return res.status(400).json({ status: "failed", message: "email missing" })
        }

        if (!password) {
            return res.status(400).json({ status: "failed", message: "password missing" })
        }
        let findUser = await User.findOne({ email });

        if (!findUser) {
            return res.status(404).json({ status: "failed", message: "account do not exist" })
        }


        const verifyPass = await bycrypt.compare(password, findUser.password);
        if (!verifyPass) {
            return res.status(401).json({ status: "failed", message: "wrong credentials" });
        }


        const token = jwt.sign(
            {
                userId: findUser._id, email: findUser.email, name: findUser.name
            },
            'ABCDEFGH',
            { expiresIn: '24h' }
        );


        console.log(findUser)
        return res.status(200).json({
            status: "success",
            message: "logged in successfully",
            token: token,
            user: { name: findUser.name, email: findUser.email }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: "error", message: "internal server error" });
    }
});
router.post("/logout", verifyToken, (_, res) => {

    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });

    return res.status(200).json({ status: "success", message: "logged out" });
});


export default router;