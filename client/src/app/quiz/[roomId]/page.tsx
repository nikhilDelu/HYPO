"use client";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
interface Question {
  question: string;
  options: [string, string, string, string];
  answer: string;
}
const socket = io("http://localhost:5000", {
  transports: ["websocket"],
});
const page = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [ques, setQues] = useState<Question[]>();
  const { roomId } = useParams();
  useEffect(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 5000);
  }, [roomId]);
  useEffect(() => {
    socket.emit("join-room", roomId);
    socket.on("questions", ({ roomId, questions, createdBy }) => {
      console.log("questions", questions);
      setQues(questions);
    });
    return () => {
      socket.off("questions");
    };
  }, [roomId]);

  return (
    <div className="flex items-center justify-center h-screen">
      <Button
        onClick={() => {
          socket.emit("get-quiz", { roomId });
        }}
      >
        Get Quiz
      </Button>
      {loading ? "Loading..." : <div>{ques && JSON.stringify(ques)}</div>}
    </div>
  );
};

export default page;
