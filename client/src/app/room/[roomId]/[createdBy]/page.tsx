"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { toast } from "sonner";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
});
export default function RoomView() {
  const { roomId, createdBy } = useParams();
  const { getToken } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<
    { message: string; user: { id: string; name: string } }[]
  >([]);
  const [desc, setDesc] = useState<string>();
  const [loading, setLoading] = useState<boolean>(false);
  const [subject, setSubject] = useState<string>("");
  const [input, setInput] = useState("");
  const { user } = useUser();
  const username = user?.fullName;
  const userId = user?.id;

  useEffect(() => {
    if (!roomId) return;
    socket.emit("join-room", roomId);

    return () => {
      socket.off("poll-started");
      socket.off("poll-updated");
      socket.off("poll-ended");
    };
  }, [roomId]);

  ///////

  useEffect(() => {
    if (!roomId) {
      return;
    }
    socket.emit("join-room", roomId);
    socket.on("quiz-started", () => {
      router.push(`/quiz/${roomId}?createdBy=${createdBy}`);
    });
    socket.on("chat-message", ({ message, user }) => {
      setMessages((prev) => [...prev, { message, user }]);
    });
    getToken()
      .then((token) => {
        return fetch(`http://localhost:5000/api/messages/${roomId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      })
      .then((res) => res.json())
      .then((data) => {
        setMessages(data);
      });
    return () => {
      socket.off("chat-message");
    };
  }, [roomId]);

  const sendMessage = () => {
    if (!input.trim()) return;
    socket.emit("chat-message", {
      roomId,
      message: input,
      user: {
        id: userId,
        name: username,
      },
    });
    setInput("");
  };
  const getQuiz = () => {
    try {
      setLoading(true);
      axios
        .post("http://localhost:5000/api/quiz", {
          sub: subject,
          createdBy,
          roomId,
        })
        .then((res) => {
          console.log("descriptoion here: ", res.data);
          setDesc(res.data.desc);
          setSubject("");
          setLoading(false);
        });
    } catch (err) {
      setLoading(false);
      toast.error(err + "");
    }
  };
  const startQuiz = () => {
    socket.emit("start", { roomId });
  };
  return (
    <div className="flex gap-2 h-screen p-6">
      {desc?.length && (
        <div className="fixed bottom-8 w-full">
          <div onClick={startQuiz}>
            <div className="w-66 active:scale-95 transition-all duration-300 cursor-pointer bg-black backdrop-blur-3xl select-none text-white p-4 rounded-full text-center mx-auto">
              Start The Battel
            </div>
          </div>
        </div>
      )}
      <div className="w-full h-full bg-gray-100/50 rounded-lg border-2 border-gray-200 flex flex-col items-center justify-center p-2">
        .
        {loading && (
          <div>
            <div className="flex items-center justify-center h-full w-full">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent border-black" />
            </div>
          </div>
        )}
        {desc && !loading ? (
          <div>{desc}</div>
        ) : (
          !loading && <div>No Questions Yet!</div>
        )}
      </div>
      <div className="w-full h-full rounded-lg border-2 border-gray-200 p-2 flex flex-col items-center justify-center gap-2">
        <h1 className="text-2xl font-bold mb-4">
          Room: {roomId}/{createdBy}
        </h1>
        {user?.id == createdBy && (
          <div className="flex gap-2 w-full max-w-xl">
            <Input
              disabled={loading}
              value={subject}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) {
                  getQuiz();
                }
              }}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject..."
            />
            <Button disabled={loading} onClick={getQuiz}>
              Generate
            </Button>
          </div>
        )}

        <div className="w-full max-w-xl h-80 bg-muted border rounded p-4 overflow-y-auto mb-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`${
                msg.user.id === user?.id && "ml-auto"
              } mb-2 w-fit bg-black text-white p-1 px-2 rounded-lg text-sm`}
            >
              <strong>
                {msg.user.id === user?.id ? "You" : msg.user.name}
              </strong>
              : {msg.message}
            </div>
          ))}
        </div>

        <div className="flex gap-2 w-full max-w-xl">
          <Input
            value={input}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message"
          />
          <Button onClick={sendMessage}>Send</Button>
        </div>
      </div>
    </div>
  );
}
