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
