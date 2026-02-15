import express from "express"
const router = express.Router();

router.post("/signup", async (req, res) => {
    let { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ status: "failed", message: "email missing" })
    }

    if (!password) {
        return res.status(400).json({ status: "failed", message: "password missing" })
    }

    return res.status(200).json({ status: "success", message: "logged in" })
});
router.post("/signin", async (req, res) => {
    let { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ status: "failed", message: "email missing" })
    }

    if (!password) {
        return res.status(400).json({ status: "failed", message: "password missing" })
    }

    return res.status(200).json({ status: "success", message: "logged in" })
})

export default router;