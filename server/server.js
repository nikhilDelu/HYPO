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
import Redis from "ioredis";

const redis = new Redis({
  host: "localhost",
  port: 6969,
});
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
  const prompt = `You are a strict JSON-only generator.

Subject: ${sub}

Generate a valid JSON object containing:
- Exactly 2 unique, original, factual multiple-choice questions related to the subject.
- A short, very tricky description (like gamified description) (1–2 lines) of the subject, with no answer hints.

JSON FORMAT:
{
  "ques": [
    {
      "question": "Your first question here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0
    },
    {
      "question": "Your second question here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 2
    }
  ],
  "desc": "A neutral, brief summary of ${sub}, without referencing the questions or giving hints."
}

🔒 Rules:
- DO NOT include markdown, backticks, comments, or explanations.
- DO NOT repeat this template. Generate real content.
- Use only straight double quotes (").
- Return ONLY the raw JSON — no extra text.
- Each "options" array MUST contain exactly 4 items.
- "answer" must be a number: 0, 1, 2, or 3.
- "desc" must be 1–2 lines and must not reveal any answers.

💥 Example violations that are not allowed:
- Answer index out of range.
- More or fewer than 4 options.
- Explanatory text or formatting outside the JSON block.
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
    console.log("match :", match);
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
      question: quiz.questions[0],
      noofquestions: quiz.questions.length,
      createdBy: quiz.createdBy,
    });
  });
  socket.on("next-question", async ({ userSocket, queindex }) => {
    socket.to(userSocket).emit(thequiz);
  });
});

server.listen(5000, () =>
  console.log("Server running on http://localhost:5000")
);
