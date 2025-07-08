import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import Room from "./models/Room.js";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import "dotenv/config";
import { Server } from "socket.io";
import http from "http";
import Message from "./models/Message.js";
import Quiz from "./models/Quiz.js";
import axios from "axios";

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
  const { sub, createdBy, roomId } = req.body;

  const prompt = `
You are an expert in ${sub}. Return only this exact JSON object:

{
  "ques": [
    {
      "question": "What is ...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 2
    },
    {
      "question": "Second question?",
      "options": ["A", "B", "C", "D"],
      "answer": 0
    }
  ],
  "desc": "A short description of ${sub}."
}

Rules:
- No explanation, markdown, or comments.
- Use straight double quotes and valid JSON only.
`;

  try {
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "llama3.2",
      prompt,
      stream: false,
    });

    // STEP 1: Clean curly quotes and code blocks
    const raw = response.data.response
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/```(json)?/g, "")
      .trim();

    // STEP 2: Extract just the JSON object
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("❌ LLM returned no parsable JSON");
      return res.status(500).json({ error: "LLM returned no JSON" });
    }

    // STEP 3: Try parsing it
    let data;
    try {
      data = JSON.parse(match[0]);
      console.log(data.desc);
    } catch (parseErr) {
      console.error("❌ Invalid JSON:\n", match[0]);
      return res.status(500).json({ error: "LLM returned malformed JSON" });
    }

    const existing = await Quiz.find();
    if (existing) {
      await Quiz.deleteMany({ roomId });
    }
    // STEP 4: Save to DB
    const quiz = await Quiz.create({
      roomId,
      questions: data.ques,
      description: data.desc,
      createdBy,
    });
    const desc = data.desc;
    res.json({ desc });
  } catch (error) {
    console.error("Quiz generation error:", error.message);
    res.status(500).json({ error: "Failed to generate quiz" });
  }
});

app.post("/api/quiz/start", async (req, res) => {
  console.log("yayyyy....");
  res.status(200).json({ redirectTo: "/quiz" });
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
  socket.on("start", ({ roomId }) => {
    try {
      io.to(roomId).emit("quiz-started", {
        roomId,
      });
    } catch (error) {
      console.error(error);
    }
  });
  socket.on("get-quiz", async ({ roomId }) => {
    const quiz = await Quiz.findOne({ roomId });
    if (!quiz) {
      return console.error("❌ No quiz found for room:", roomId);
    }
    io.to(roomId).emit("questions", {
      roomId: roomId,
      questions: quiz.questions,
      createdBy: quiz.createdBy,
    });
  });
});

server.listen(5000, () =>
  console.log("Server running on http://localhost:5000")
);
