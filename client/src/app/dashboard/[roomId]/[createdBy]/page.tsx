"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { toast } from "sonner";
import { Check, Copy, Menu } from "lucide-react";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
});
export default function RoomView() {
  const { roomId, createdBy } = useParams();
  const { getToken } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<
    { message: string; user: { id: string; name: string }; createdAt: Date }[]
  >([]);
  const [desc, setDesc] = useState<string>();
  const [loading, setLoading] = useState<boolean>(false);
  const [subject, setSubject] = useState<string>("");
  const [input, setInput] = useState("");
  const { user } = useUser();
  const username = user?.fullName;
  const userId = user?.id;
  const [users, setUsers] = useState<{ username?: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const fullCode = `${roomId}/${createdBy}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  useEffect(() => {
    fetch("/data.json")
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch((err) => console.error("Failed to load users:", err));
  }, []);

  useEffect(() => {
    if (!roomId) return;
    socket.emit("join-room", roomId);

    return () => {
      socket.off("poll-started");
      socket.off("poll-updated");
      socket.off("poll-ended");
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId) {
      return;
    }
    socket.emit("join-room", roomId);
    socket.on("quiz-started", () => {
      router.push(`/quiz/${roomId}?createdBy=${createdBy}`);
    });
    socket.on("chat-message", ({ message, user }) => {
      setMessages((prev) => [
        ...prev,
        { message, user, createdAt: new Date() },
      ]);
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
        createdAt: new Date(),
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
    <div className="flex  max-h-screen overflow-hidden h-screen fixed w-screen">
      {desc?.length && (
        <div className="fixed bottom-8 w-full">
          <div onClick={startQuiz}>
            <div className="w-66 active:scale-95 transition-all duration-300 cursor-pointer  backdrop-blur-3xl select-none text-white p-4 rounded-full text-center mx-auto">
              Start The Battel
            </div>
          </div>
        </div>
      )}
      {/* participants */}
      <div className="h-screen w-[30%] border-r-1 border-black bg-[#d4dad3]  overflow-y-scroll min-w-52 shadow-2xl">
        <div className="border-b-2 border-black flex items-center px-3 p-[6.4px]">
          Participants
        </div>
        {users.map((u, index) => (
          <div
            className="flex items-center justify-start gap-2 border-b-1 border-black p-2 h-16 font-mono"
            key={index}
          >
            <span className="uppercase rounded-full bg-black size-8 min-w-8  text-[#d4dad3] flex items-center justify-center overflow-hidden">
              {u && u?.username?.charAt(0)}
            </span>
            <span className="mb-1 max-w-32 line-clamp-1 overflow-hidden">
              {u && u?.username}
            </span>
            <Menu className="ml-auto cursor-pointer" />
          </div>
        ))}
      </div>
      {/* Actions/info */}
      <div className="w-full h-screen  flex flex-col relative">
        {/* stats panel */}
        <div className="shadow-2xl flex-[1] p-[4.1px] border-b-2 border-gray-600 bg-black text-[#d4dad3] px-3 font-mono text-sm overflow-x-auto whitespace-nowrap flex items-center justify-between gap-2">
          <div className="flex gap-6 min-w-max">
            <span>📚 Subject: {desc ? desc.slice(0, 30) + "..." : "None"}</span>
            <span>👥 Participants: {users.length}</span>
            <span>💬 Messages: {messages.length}</span>
          </div>
          <div className="text-green-400 animate-pulse min-w-max ml-auto pr-2">
            ● Live
          </div>
        </div>

        {/* desc */}
        <div className="flex-[6] bg-black items-center flex justify-center">
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
            !loading && <div>No Description Yet!</div>
          )}
        </div>
        {/* Poll */}
        <div className="bg-black flex-[8]">Poll</div>
        {/* Other stuff */}
        <div className="bg-black flex-[8]">Other Stuff</div>
        <div className="absolute bottom-2 flex items-center right-0 left-0 justify-center">
          {user?.id == createdBy && (
            <div className="flex gap-2 w-full max-w-xl backdrop-blur-3xl shadow-2xl">
              <Input
                disabled={loading}
                className="rounded-none border-[#d4dad3] text-[#d4dad3]"
                value={subject}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    getQuiz();
                  }
                }}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject..."
              />
              <Button
                className="rounded-none"
                disabled={loading}
                onClick={getQuiz}
              >
                Generate
              </Button>
            </div>
          )}
        </div>
      </div>
      {/* chat */}
      <div className="w-[26%] border-l-2 border-gray-600 overflow-hidden flex flex-col justify-between h-full bg-[#d4dad3] cursor-cell min-w-[20%] shadow-2xl">
        <h1
          className="font-bold bg-black text-[#d4dad3] flex items-center justify-between cursor-pointer p-2 text-wrap border-b-2 border-gray-600 overflow-x-auto whitespace-nowrap group"
          onClick={copyToClipboard}
        >
          <div className="flex items-center gap-2">
            <span className="text-green-400">{">"}</span>
            <span className="max-w-52 text-[#d4dad3] overflow-hidden">
              {fullCode}
            </span>
          </div>
          {copied ? (
            <Check className="w-4 h-4 text-green-500 ml-2" />
          ) : (
            <Copy className="w-4 h-4 ml-2 group-hover:text-green-400" />
          )}
        </h1>

        <div className="w-full h-full max-w-full overflow-y-auto bg-black text-[#d4dad3] font-mono relative ">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`max-w-[75%] px-3 w-fit py-1 text-sm break-words flex gap-1 ${
                msg.user.id === user?.id ? "ml-auto text-right " : "text-left "
              } rounded shadow`}
            >
              {msg.user.id !== user?.id && (
                <span className="bg-green-600 text-green-600 w-[2.5px] text-[0px]">
                  |
                </span>
              )}
              <div className="max-w-full">
                {msg.user.id !== user?.id && (
                  <div className="text-[10px] text-green-300 font-semibold">
                    {msg.user.name}
                  </div>
                )}
                <div
                  className={`whitespace-pre-wrap text-[16px] leading-tight flex gap-2 p-1 rounded- ${
                    msg.user.id !== user?.id
                      ? "justify-start text-left"
                      : "justify-end text-right flex-row-reverse"
                  }`}
                >
                  {/* Message */}
                  <div className="max-w-40">{msg.message}</div>

                  {/* Timestamp */}
                  <div className="text-[8px] w-11 line-clamp-1 text-gray-400 mt-auto mb-[1px] z-50">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative w-full max-w-md border-0 bg-black  backdrop-blur-sm">
          <Input
            disabled={loading}
            value={input}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                sendMessage();
              }
            }}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message..."
            className="rounded-none text-[#d4dad3] caret-transparent font-mono text-base focus:outline-none border-0 px-3 py-2"
          />
          <span
            className="absolute left-[calc(1ch+theme(spacing.3))] top-[50%] translate-y-[-50%] w-[1ch] h-[1.25em] bg-[#d4dad3] animate-blink pointer-events-none"
            style={{
              left: `calc(${input.length}ch + 12px)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
