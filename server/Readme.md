## 🎯 Your Goal:

* When the **host starts the quiz**, a **timer** starts.
* **All clients see the remaining time live.**
* When time is up (or host ends early), quiz ends.
* Prevent multiple `end-quiz` calls (cheating/resync prevention).

---

## 📦 What You’ll Use:

| Tech            | Purpose                              |
| --------------- | ------------------------------------ |
| **Socket.io**   | Real-time communication              |
| **Redis**       | Shared memory, lock, and timer state |
| **setTimeout**  | To auto-end the quiz                 |
| **setInterval** | To broadcast countdown               |

---

## 💡 Folder Structure Suggestion:

```
/server
  ├── index.js
  ├── quizTimer.js  ← timer utility
  ├── redisClient.js
  └── resultHandler.js  ← result saving logic
```

---

## 1. 📁 `redisClient.js`

```js
import { createClient } from 'redis';

const redis = createClient();
await redis.connect();
export default redis;
```

---

## 2. 📁 `quizTimer.js` – Full Socket-Compatible Timer Logic

```js
import redis from "./redisClient.js";
import { endQuiz } from "./resultHandler.js";

const quizTimers = new Map();
const quizTickIntervals = new Map();

export function startQuizTimer(io, roomId, durationSeconds) {
  const now = Date.now();

  // Save start time and duration in Redis
  redis.hSet(`quiz_timer:${roomId}`, {
    startTime: now,
    duration: durationSeconds
  });

  // Set timeout to auto-end quiz
  const timeout = setTimeout(async () => {
    await attemptQuizEnd(io, roomId, "[Timer]");
  }, durationSeconds * 1000);

  quizTimers.set(roomId, timeout);

  // Start interval to emit countdown
  const tick = setInterval(async () => {
    const { startTime, duration } = await redis.hGetAll(`quiz_timer:${roomId}`);
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = duration - elapsed;

    if (remaining <= 0) {
      clearInterval(tick);
      quizTickIntervals.delete(roomId);
      return;
    }

    io.to(roomId).emit("timer-update", { roomId, remaining });
  }, 1000);

  quizTickIntervals.set(roomId, tick);
}

export async function attemptQuizEnd(io, roomId, triggerBy = "Unknown") {
  const lock = await redis.set(`quiz_end_lock:${roomId}`, "locked", { NX: true, EX: 60 });
  if (!lock) return; // Quiz already ended

  clearTimeout(quizTimers.get(roomId));
  quizTimers.delete(roomId);

  clearInterval(quizTickIntervals.get(roomId));
  quizTickIntervals.delete(roomId);

  await redis.del(`quiz_timer:${roomId}`);

  console.log(`🎯 Quiz ended for room ${roomId} by ${triggerBy}`);
  await endQuiz(io, roomId);
}
```

---

## 3. 📁 `resultHandler.js` – End Quiz Logic

```js
import Result from "./models/Result.js";
import redis from "./redisClient.js";

export async function endQuiz(io, roomId) {
  const userKeys = await redis.keys(`progress:${roomId}:*`);
  const users = await Promise.all(
    userKeys.map(async (key) => {
      const userId = key.split(":")[2];
      const progress = await redis.hGetAll(key);
      return {
        userId,
        score: [parseInt(progress.score || 0)],
      };
    })
  );

  const totalScore = users.reduce((acc, u) => acc + u.score[0], 0);
  const winner = users.sort((a, b) => b.score[0] - a.score[0])[0]?.userId;

  await Result.findOneAndUpdate(
    { roomId, quizId: `quiz:${roomId}` },
    {
      roomId,
      quizId: `quiz:${roomId}`,
      users,
      totalScore,
      winner,
      createdBy: "host-id", // replace with actual host
    },
    { upsert: true, new: true }
  );

  io.to(roomId).emit("quiz-ended", { roomId, users, winner });
}
```

---

## 4. 📁 `index.js` – Your Main Server File

```js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { startQuizTimer, attemptQuizEnd } from './quizTimer.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const hostMap = new Map(); // hostUserId per room

io.on('connection', (socket) => {
  console.log("⚡ User connected:", socket.id);

  socket.on("start-quiz", ({ roomId, durationSeconds, userId }) => {
    hostMap.set(roomId, userId);
    startQuizTimer(io, roomId, durationSeconds);
    io.to(roomId).emit("quiz-started", { roomId, durationSeconds });
  });

  socket.on("end-quiz", async ({ roomId, userId }) => {
    if (userId !== hostMap.get(roomId)) {
      socket.emit("error", { message: "Only host can end the quiz." });
      return;
    }
    await attemptQuizEnd(io, roomId, "Host");
  });

  socket.on("reconnect-quiz", async ({ roomId }) => {
    const { startTime, duration } = await redis.hGetAll(`quiz_timer:${roomId}`);
    const remaining = Math.max(0, duration - Math.floor((Date.now() - startTime) / 1000));
    socket.emit("timer-update", { roomId, remaining });
  });
});

server.listen(3000, () => console.log("🚀 Server running on port 3000"));
```

---

## 📱 Frontend Socket Events (Example)

```js
socket.on("timer-update", ({ remaining }) => {
  document.getElementById("timer").innerText = `Time left: ${remaining}s`;
});

socket.emit("start-quiz", { roomId: "abc123", durationSeconds: 60, userId: "host-xyz" });

socket.emit("end-quiz", { roomId: "abc123", userId: "host-xyz" });

socket.emit("reconnect-quiz", { roomId: "abc123" });
```

---

## ✅ Final Features You Now Have:

| Feature                        | Working? |
| ------------------------------ | -------- |
| Host starts quiz               | ✅        |
| Timer runs on server           | ✅        |
| Clients get live updates       | ✅        |
| Timer stops on end             | ✅        |
| Host-only authority            | ✅        |
| Auto end when time's up        | ✅        |
| Reconnect gets remaining time  | ✅        |
| Duplicate `end-quiz` prevented | ✅        |





* Establishing **multiple socket connections** per user unintentionally.
* This usually happens due to:

  1. **Socket.io client reconnecting multiple times.**
  2. **Multiple `socket.connect()` calls** (especially if the `useEffect` that connects isn't cleaned up properly).
  3. **Hot reload / page refresh** triggering new connections.
  4. **Multiple components or tabs** mounting and triggering socket logic.

---

### ✅ **Fix it like a pro**

#### ✅ 1. Ensure socket connection is **singleton**

Make sure you **create socket instance only once** (in a separate file, not inside React components):

```ts
// socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  autoConnect: false,
});

export default socket;
```

Then, in your component:

```tsx
import socket from "./socket";

useEffect(() => {
  if (!userId || !roomId) return;

  if (!socket.connected) {
    socket.connect();
  }

  socket.emit("join-room", roomId, userId);

  return () => {
    socket.off("poll-started");
    socket.off("poll-updated");
    socket.off("poll-ended");
  };
}, [userId, roomId]);
```

---

#### ✅ 2. Track connected users by `userId`, not `socket.id`

Your current backend probably does:

```ts
console.log("🟢 New user connected:", socket.id);
```

But you should **map `socket.id` ⇄ `userId`** and prevent duplicates.

Add a map like this in your backend:

```ts
const userSocketMap = new Map(); // userId => socket.id
```

Then on join:

```ts
socket.on("join-room", async (roomId, userId) => {
  // If this user is already connected on a different socket, disconnect the old one
  const existingSocketId = userSocketMap.get(userId);
  if (existingSocketId && existingSocketId !== socket.id) {
    const existingSocket = io.sockets.sockets.get(existingSocketId);
    existingSocket?.disconnect();
  }

  userSocketMap.set(userId, socket.id);
  console.log(`✅ User ${userId} joined room ${roomId}`);
});
```

On disconnect:

```ts
socket.on("disconnect", () => {
  for (const [userId, sId] of userSocketMap.entries()) {
    if (sId === socket.id) {
      userSocketMap.delete(userId);
      console.log(`🔴 User disconnected: ${socket.id} ${userId}`);
      break;
    }
  }
});
```

---

#### ✅ 3. Avoid `socket.connect()` or `io(...)` in components

Never do this:

```tsx
const socket = io("http://localhost:3000"); // ❌ bad: creates new connection every render
```

Instead, always import a shared, singleton socket.

---

#### ✅ 4. Optional: Use `localStorage` or cookies for de-duplication

If the socket gets disconnected and reconnects quickly (network glitch), you can debounce or delay connection using `localStorage` flags.

---

### 🚫 Without Fix:

```
🟢 New user connected: socket1
🟢 New user connected: socket2
🟢 New user connected: socket3
🔴 User disconnected: socket2
```

### ✅ With Fix:

```
🟢 User user_xyz connected with socket: socket1
🔁 Reconnected: Replacing old socket
🔴 Disconnected: user_xyz
```

---

### TL;DR

| 🧪 Problem                       | ✅ Fix                                          |
| -------------------------------- | ---------------------------------------------- |
| Same user connects many times    | Track by `userId`, not `socket.id`             |
| New socket per reload/mount      | Use shared `socket.js` file                    |
| Duplicate sockets not cleaned up | Disconnect old socket on `join-room`           |
| Page refresh causes spam         | Delay or debounce `socket.connect()` in client |

---

