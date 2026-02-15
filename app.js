import express from "express";
const app = express();

app.get("/", async (_, res) => {
    res.status(200).json({ "hello": "i am wroking" })
})

app.listen(5001, () => console.log("checking"))