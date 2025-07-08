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
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
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

const activePolls = {};

io.on("connection", (socket) => {
  socket.on("create-poll", ({ roomId, subjects }) => {
    if (!roomId || !Array.isArray(subjects)) return;

    activePolls[roomId] = {
      subjects,
      votes: {}, // {subjectName: count}
    };
    io.to(roomId).emit("pool-started", { subjects });
  });

  socket.on("vote", ({ roomId, subject }) => {
    const poll = activePolls[roomId];
    if (!poll || !poll.subjects.includes(subject)) return;

    poll.votes[subject] = (poll.votes[subject] || 0) + 1;
    io.to(roomId).emit("poll-updated", poll.votes);
  });

  socket.on("end-poll", ({ roomId }) => {
    const poll = activePolls[roomId];
    if (!poll) return;

    const result = Object.entries(poll.votes).sort((a, b) => b[1] - a[1])[0];
    const winningSubject = result?.[0] || null;

    io.to(roomId).emit("poll-ended", { subject: winningSubject });
    delete activePolls[roomId];
  });

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
