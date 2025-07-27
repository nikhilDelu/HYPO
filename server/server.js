import express, { response } from "express";
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
import { createClient } from "redis";
import { createPerplexity } from "@ai-sdk/perplexity";
import { generateText } from "ai";

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

const redis = createClient({
  url: "redis://172.25.103.107:6379",
});

redis.on("error", (err) => console.error("Redis Client Error", err));

await redis.connect();

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(clerkMiddleware({}));
app.use((req, res, next) => {
  console.log("Auth header:", req.headers.authorization);
  next();
});

//PERPLEXITY_API_KEY=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
const perplexity = createPerplexity({
  apiKey: "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",
});

app.post("/api/rooms", requireAuth(), async (req, res) => {
  const { name } = req.body;
  const roomId = Math.random().toString(36).substring(2, 10);
  const createdBy = req.auth.userId;
  const robj = {
    roomId: roomId,
    rname: name,
    createdBy: createdBy,
  };
  const saved = await redis.json.set(`room:${roomId}`, "$", robj);
  const room = await Room.create({ roomId, name, createdBy });
  res.json({ roomId: room.roomId, createdBy: room.createdBy, name: room.name });
});
app.get("/api/messages/:roomId", requireAuth(), async (req, res) => {
  const { roomId } = req.params;
  const exists = await redis.exists(`room:${roomId}:messages`);
  if (exists) {
    const messages = await redis.lRange(`room:${roomId}:messages`, 0, -1);
    const rmsgs = messages.map((msg) => JSON.parse(msg));
    console.log("Messages from Redis:", rmsgs);
    return res.json(rmsgs);
  } else {
    res.status(201).json([]);
  }
});

// Quiz Generation
// app.post("/api/quiz", async (req, res) => {
//   const { sub, createdBy, roomId, entryfee } = req.body;
//   const prompt = `You are a strict JSON-only generator.

// Subject: ${sub}

// Generate a valid JSON object containing:
// - Exactly 2 unique, original, factual multiple-choice questions related to the subject.
// - A short, very tricky description (like gamified description) (1-2 lines) of the subject, with no answer hints.

// JSON FORMAT:
// {
//   "ques":
//   [
//     {
//       "question": "Your first question here?",
//       "options": ["Option A", "Option B", "Option C", "Option D"],
//       "answer": 0
//     },
//     {
//       "question": "Your second question here?",
//       "options": ["Option A", "Option B", "Option C", "Option D"],
//       "answer": 2
//     }
//   ],
//   "desc": "A neutral, brief puzzle of ${sub}, without referencing the questions or giving hints."
// }

// 🔒 Rules:
// - DO NOT include markdown, backticks, comments, or explanations.
// - DO NOT repeat this template. Generate real content.
// - Use only straight double quotes (").
// - Return ONLY the raw JSON — no extra text.
// - Each "options" array MUST contain exactly 4 items.
// - "answer" must be a number: 0, 1, 2, or 3.
// - "desc" must be 2-3 lines and must not reveal any answers.

// 💥 Example violations that are not allowed:
// - Answer index out of range.
// - More or fewer than 4 options.
// - Explanatory text or formatting outside the JSON block.
// `;

//   try {
//     const response = await axios.post("http://localhost:11434/api/generate", {
//       model: "llama3.2:latest",
//       system: "You are strict Json-only generator. you must follow the structure of json without any error. response should contain only the structure which is defined",
//       prompt,
//       stream: false,
//     });

//     // STEP 1: Clean curly quotes and code blocks
//     const raw = response.data.response
//       .replace(/[“”]/g, '"')
//       .replace(/[‘’]/g, "'")
//       .replace(/```(json)?/g, "")
//       .trim();

//     // STEP 2: Extract just the JSON object
//     const match = raw.match(/\{[\s\S]*\}/);
//     if (!match) {
//       console.error("❌ LLM returned no parsable JSON");
//       return res.status(500).json({ error: "LLM returned no JSON" });
//     }

//     // STEP 3: Try parsing it
//     let data;
//     console.log("match :", match);
//     try {
//       data = JSON.parse(match[0]);
//       console.log("This is data description:  ", data.desc);
//     } catch (parseErr) {
//       console.error("❌ Invalid JSON:\n", match[0]);
//       return res.status(500).json({ error: "LLM returned malformed JSON" });
//     }

//     const existing = await Quiz.find();
//     if (existing) {
//       await Quiz.deleteMany({ roomId });
//     }
//     // STEP 4: Save to DB
//     const quiz = await Quiz.create({
//       roomId,
//       questions: data.ques,
//       description: data.desc,
//       entryfee: entryfee,
//       createdBy,
//     });
//     console.log("quiz created:", quiz)
//     if (quiz) {
//       await redis.json.set(`quiz:${roomId}`, "$", quiz);
//     }
//     const desc = data.desc;
//     res.json({ _id: quiz._id, desc });
//   } catch (error) {
//     console.error("Quiz generation error:", error.message);
//     res.status(500).json({ error: "Failed to generate quiz" });
//   }
// });

app.post("/api/quiz", async (req, res) => {
  const { sub, createdBy, roomId, entryfee } = req.body;
  const prompt = `System: JSON only.  
10 factual MCQs on ${sub}. Each {"q","opts","ans"}; 4 opts; 0-3 ans.  
Add "desc": 2-line neutral puzzle on ${sub}, no hints.  
Return exactly: {"ques":[{"q":"","opts":["","","",""],"ans":0},{"q":"","opts":["","","",""],"ans":2}, ...],"desc":""}  
No markdown or extra text.`;
  const response = await generateText({
    model: perplexity("sonar"),
    prompt: prompt,
    response_format: { type: "json_object" },
    max_tokens: 1000,
    temperature: 0.4,
  });
  const resp = JSON.parse(response.text);
  console.log(resp);

  const existing = await Quiz.find();
  if (existing) {
    await Quiz.deleteMany({ roomId });
  }

  // STEP 4: Save to DB
  const quiz = await Quiz.create({
    roomId,
    questions: resp.ques,
    description: resp.desc,
    entryfee: entryfee,
    createdBy,
  });
  console.log("quiz created:", quiz);
  if (quiz) {
    await redis.json.set(`quiz:${roomId}`, "$", quiz);
  }
  const desc = resp.desc;
  res.json({ _id: quiz._id, desc });
});

app.post("/api/quiz/start", async (req, res) => {
  console.log("yayyyy....");
  res.status(200).json({ redirectTo: "/quiz" });
});

// async function sendResult() {
//   const quizId = await redis.json.get(`quiz:${roomId}`, "$._id");
//   const usrs = await redis.sMembers(`room:${roomId}:users`);
//   let winner = "";
//   let maxScore = 0;
//   const users = await Promise.all(usrs.map(async (usr) => {
//     const userScore = await redis.hGet(`progress:${roomId}:${usr}`, "score");
//     if (userScore > maxScore) {
//       maxScore = userScore;
//       winner = usr;
//     }
//     return {
//       userId: usr,
//       score: parseInt(userScore) || 0,
//     };
//   }));

//   const result = {
//     roomId: roomId,
//     quizId: quizId,
//     users: users,
//     maxScore: maxScore,
//     winner: user.username,
//     createdAt: new Date().toISOString(),
//   }

//   await Result.create(result);
// }

//
const activePolls = {};

io.on("connection", (socket) => {
  console.log("🟢 New user connected:", socket.id);

  // Join room : Update the Frontend to emit the userId
  socket.on("join-room", async (roomId, userId) => {
    if (!roomId || !userId) {
      return socket.emit("error", "Invalid username or room not found!");
    }

    await redis.set(`${userId}`, socket.id);
    socket.join(roomId);
    console.log(roomId, "  ", userId);
    await redis.sAdd(`room:${roomId}:users`, userId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Chatting
  socket.on("chat-message", async ({ message, user }) => {
    const roomId = socket.data.roomId;
    const msg = {
      roomId: roomId,
      message: message,
      user: user,
      timestamp: new Date().toISOString(),
    };
    // const msg = await Message.create({ roomId, message, user });
    console.log("New message:", msg);
    await redis.rPush(`room:${roomId}:messages`, JSON.stringify(msg));
    io.to(roomId).emit("chat-message", { message, user });
  });

  //Go to quiz
  socket.on("start", ({ roomId }) => {
    try {
      io.to(roomId).emit("quiz-started", {
        roomId,
      });
    } catch (error) {
      console.error(error);
    }
  });

  //Start the Quiz
  socket.on("get-quiz", async ({ roomId, _id }) => {
    //const quizdb = await Quiz.findOne({ roomId });
    const quiz = await redis.json.get(`quiz:${roomId}`, "$");
    console.log("In get quiz: ", quiz.questions[0]);
    if (!quiz) {
      return console.error("❌ No quiz found for room:", roomId);
    }
    io.to(roomId).emit("questions", {
      question: quiz.questions[0],
      noquest: quiz.questions.length,
      createdBy: quiz.createdBy,
    });
    // const timer = setTimeout(() => {
    //   console.log("Quiz ended for room:", roomId);
    //   endQuiz(roomId);
    //   io.to(roomId).emit("quiz-ended", { roomId, quizId: _id });
    // })
  });

  // Handle next question
  // queIndex is the index of next question ; cscore is the score of last question
  socket.on("next-question", async ({ roomId, queindex, userId, cscore }) => {
    const next = await redis.json.get(
      `quiz:${roomId}`,
      "$.ques[" + queindex + "]"
    );
    let score =
      parseInt(await redis.hGet(`progress:${roomId}:${userId}`, "score")) || 0;
    if (cscore) {
      score += cscore;
    }

    await redis.hSet(`progress:${roomId}:${userId}`, {
      currentQuestion: queindex + 1,
      score,
    });
    socket.emit("next-question", next);
  });

  //Handle end of quiz
  socket.on("end-quiz", async ({ roomId, score, user }) => {
    console.log("Quiz ended for room:", roomId);
    res = await redis.hGet(`progress:${roomId}:${user.id}`, "score");
    members = await redis.sMembers(`room:${roomId}:users`);
    if (!members.includes(socket.data.user)) {
      console.error("❌ User not found in room:", user.id);
      return;
    }
    if (!res) {
      console.error("❌ No progress found for user:", user.id);
      return;
    }
    io.to(roomId).emit("quiz-ended", { roomId, score, user });
  });

  socket.on("disconnect", async () => {
    console.log("🔴 User disconnected:", socket.id);
    //await redis.sRem(`room:${}:users`, socket.data.userId);
  });
});

server.listen(5000, () =>
  console.log("Server running on http://localhost:5000")
);
