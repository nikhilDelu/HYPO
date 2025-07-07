"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, useUser } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", { transports: ["websocket"] });
export default function RoomView() {
  const { roomId } = useParams();
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<
    { message: string; user: { id: string; name: string } }[]
  >([]);
  const [input, setInput] = useState("");
  const { user } = useUser();
  const username = user?.fullName;
  const userId = user?.id;

  useEffect(() => {
    if (!roomId) {
      return;
    }
    socket.emit("join-room", roomId);
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
        console.log(JSON.stringify(data));
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
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">Room: {roomId}</h1>

      <div className="w-full max-w-xl h-80 bg-muted border rounded p-4 overflow-y-auto mb-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`${
              msg.user.id === user?.id && "ml-auto"
            } mb-2 w-fit bg-black text-white p-1 px-2 rounded-lg text-sm`}
          >
            <strong>{msg.user.id === user?.id ? "You" : msg.user.name}</strong>:{" "}
            {msg.message}
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
  );
}
