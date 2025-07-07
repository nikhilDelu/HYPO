import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import Room from "./models/Room.js";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import "dotenv/config";
import { Server } from "socket.io";
import http from "http";
import Message from "./models/Message.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});
mongoose.connect(
  "mongodb+srv://projectyjka:53yjka21@asciicluster0.pgohfwc.mongodb.net/ASCIIdb"
);
app.use(cors({ origin: "https://hypo-orpin.vercel.app/", credentials: true }));
app.use(express.json());
app.use(clerkMiddleware({}));
app.use((req, res, next) => {
  console.log("Auth header:", req.headers.authorization);
  next();
});
app.post("/api/rooms", requireAuth(), async (req, res) => {
  const { name } = req.body;
  const roomId = Math.random().toString(36).substring(2, 10);
  const createdBy = req.auth.userId;

  const room = await Room.create({ roomId, name, createdBy });
  res.json({ roomId: room.roomId });
});
app.get("/api/messages/:roomId", requireAuth(), async (req, res) => {
  const { roomId } = req.params;

  const messages = await Message.find({ roomId }).sort({ createdAt: 1 });

  res.json(messages);
});

io.on("connection", (socket) => {
  console.log("🟢 New user connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });
  socket.on("chat-message", async ({ roomId, message, user }) => {
    const msg = await Message.create({ roomId, message, user });
    io.to(roomId).emit("chat-message", { message, user });
  });
  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

server.listen(5000, () =>
  console.log("Server running on http://localhost:5000")
);
