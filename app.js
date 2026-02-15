import express from "express";
import { connect_to_DB } from "./db.js";
const app = express();
app.use(express.json())
connect_to_DB("mongodb://localhost:27017/Hintro")
app.get("/", async (_, res) => {
    res.status(200).json({ "hello": "i am wroking" })
})

app.listen(5001, () => console.log("checking"))