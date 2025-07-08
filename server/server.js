import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import Room from "./models/Room.js";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import "dotenv/config";
import { Server } from "socket.io";
import http from "http";
import Message from "./models/Message.js";
import axios from "axios";
import Stream from "stream";

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
  res.json({ roomId: room.roomId, createdBy: room.createdBy, name: room.name });
});
app.get("/api/messages/:roomId", requireAuth(), async (req, res) => {
  const { roomId } = req.params;

  const messages = await Message.find({ roomId }).sort({ createdAt: 1 });

  res.json(messages);
});

// quiz part
app.post("/api/quiz", async (req, res) => {
  try {
    const sub = req.body.sub;

    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "llama3.2",
      prompt: `You are an expert in ${sub}. Return a JSON object with 2 items:

1. A list of exactly 2 multiple-choice questions.
2. A short, factual description of the subject ${sub} (2-4 lines only).

The format must be:

{
  "ques" :[
    {
      "question": "Your question here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 2
    },
    {
      "question": "Second question here?",
      "options": ["A", "B", "C", "D"],
      "answer": 0
    }
  ],
  "desc":"Subject description here",
  }

Strict rules:
- Only return this JSON object. No comments, no extra output.
- Make all 4 options realistic and related to the question.
- "answer" is the correct option's index (0 to 3).
- Description must not reference the questions or give hints.
- Use only straight double quotes ("), commas, and valid JSON.

      `,
      stream: false,
    });
    const raw = response.data.response
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/```(json)?/g, "")
      .trim();

    const data = JSON.parse(raw);

    try {
      console.log(data + "\n\n The something" + data.desc);

      // const quiz = JSON.parse(data["ques"]);

      const des = data["desc"];
      console.log("des import success....");
      res.json(des);
    } catch (parseErr) {
      console.error("Invalid JSON from LLM \n", data + "\n\n" + parseErr);
      res.status(500).json({ error: "\n \n \nLLM returned malformed JSON \n" });
    }
  } catch (error) {
    console.error("Quiz generation error:", error.message);
    res.status(500).json({ error: "Failed to generate quiz" });
  }
});

//
const activePolls = {};

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
