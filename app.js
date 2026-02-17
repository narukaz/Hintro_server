import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { connect_to_DB } from "./db.js";
import auth_router from "./routes/auth_route.js"
import cors from "cors"
import dotenv from 'dotenv';
import board_router from "./routes/board_route.js"
import card_route
    from "./routes/card_route.js"

import list_route from "./routes/list_route.js"
import notification_route from "./routes/notification_route.js"
import cookieParser from "cookie-parser";
dotenv.config();

const app = express();
const httpServer = createServer(app);


const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        credentials: true,
    }
});


app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// connect_to_DB("mongodb://localhost:27017/Hintro");
connect_to_DB(process.env.MONGO_URI);


io.on("connection", (socket) => {
    console.log("User Connected:", socket.id);


    socket.on("join_board", (boardId) => {
        socket.join(boardId);
        console.log(`User ${socket.id} joined board: ${boardId}`);
    });

    socket.on("disconnect", () => {
        console.log("User Disconnected");
    });
});

app.get("/", async (_, res) => {
    res.status(200).json({ "hello": "i am working" })
});

app.use("/auth", auth_router);
app.use("/board", board_router);
app.use("/card", card_route);
app.use("/list", list_route);
app.use("/notifications", notification_route);

// Use httpServer instead of app.listen
httpServer.listen(process.env.PORT, () => console.log("Server running with Sockets on port 5001"));