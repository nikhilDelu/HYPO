"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, useUser } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("https://hypo-1jcf.onrender.com/", {
  transports: ["websocket"],
});
export default function RoomView() {
  ///////
  const [isCreator, setIsCreator] = useState(true);
  const [subjects, setSubjects] = useState(["Math", "Science", "GK"]);
  const [pollStarted, setPollStarted] = useState(false);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [winner, setWinner] = useState("");
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
    if (!roomId) return;

    // Fetch room creator from server (if you want strict creator check later)
    // For now, just check if current user created the room locally

    socket.emit("join-room", roomId);

    socket.on("poll-started", ({ subjects }) => {
      setPollStarted(true);
      setSubjects(subjects);
      setVotes({});
    });

    socket.on("poll-updated", (voteCounts) => {
      setVotes(voteCounts);
    });

    socket.on("poll-ended", ({ subject }) => {
      setWinner(subject);
      setPollStarted(false);
    });

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

      {!pollStarted && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Start Subject Poll</h2>
          {isCreator && (
            <>
              <div className="flex gap-2">
                {subjects.map((subj, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    onClick={() => {
                      socket.emit("create-poll", { roomId, subjects });
                    }}
                  >
                    Start Poll with: {subj}
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {pollStarted && (
        <div className="mt-6">
          <h2 className="text-lg font-medium mb-2">Vote for a Subject</h2>
          <div className="flex gap-3 flex-wrap">
            {subjects.map((subj, idx) => (
              <Button
                key={idx}
                onClick={() => socket.emit("vote", { roomId, subject: subj })}
              >
                {subj} ({votes[subj] || 0})
              </Button>
            ))}
          </div>

          {isCreator && (
            <Button
              className="mt-4"
              onClick={() => socket.emit("end-poll", { roomId })}
            >
              End Poll
            </Button>
          )}
        </div>
      )}

      {winner && (
        <div className="mt-4 text-green-600 font-bold text-lg">
          🎉 Selected Subject: {winner}
        </div>
      )}
    </div>
  );
}
