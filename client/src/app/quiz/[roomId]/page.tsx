"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { io } from "socket.io-client";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  autoConnect: false,
});

// Type for a single question
interface Question {
  q: string;
  opts: [string, string, string, string];
  ans: number; // index of correct option
  _id: string;
}

export default function QuizPage() {
  const [question, setQuestion] = useState<Question>(); // *
  const [currentIndex, setCurrentIndex] = useState(0); // *
  const [selected, setSelected] = useState<number[]>([]);
  const [isCorrect, setIsCorrect] = useState(false); // *
  const [quizLength, setQuizLength] = useState(0); // *
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const { roomId } = useParams();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const owner = searchParams.get("createdBy");
  const router = useRouter();
  const userId = user?.id
  // Fullscreen and emit quiz
  function enterFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) {
      (elem as any).msRequestFullscreen();
    }
    socket.emit("get-quiz", { roomId, userId });
  }

  // Join room and receive questions
  useEffect(() => {
    if (!user?.id) return;
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit("join-room", roomId, user.id); // Pass userId as well

    //On Rejoining the Quiz
    socket.on("continue-quiz", (data) => {
      console.log(data);
      socket.emit("next-question", { roomId, queindex: data, userId: user?.id, isCorrect: false });

    })

    //First Question and Metadata
    socket.on("questions", (data) => {
      console.log(data);
      setQuestion(data.question); // Wrap single question in array
      setQuizLength(data.noquest);
      console.log("Received quiz:", data.question);
    });

    //For next Question
    socket.on("next-question", (data) => {
      setQuestion(data);
      //console.log("From next-question Recieved Question: ", data);
    })

    return () => {
      socket.off("questions");
    };
  }, [roomId, user?.id]);

  // Prevent user from switching tabs
  // useEffect(() => {
  //   const handleBlur = () => {
  //     alert("Don't switch tabs during the quiz!");
  //   };
  //   window.addEventListener("blur", handleBlur);
  //   return () => window.removeEventListener("blur", handleBlur);
  // }, []);

  // Prevent reload
  useEffect(() => {
    window.onbeforeunload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
  }, []);

  // Disable certain keys
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && ["u", "s", "c", "v", "r"].includes(e.key.toLowerCase())) ||
        e.key === "F12" ||
        e.key === "Escape"
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyboard);
    return () => {
      document.removeEventListener("keydown", handleKeyboard);
    }
  }, []);

  // Handle answer click
  const handleAnswer = (optionIndex: number) => {
    if (selected[currentIndex] !== undefined) return;

    setIsCorrect(question?.ans === optionIndex);
    if (isCorrect) setScore((prev) => prev + 1);

    setSelected((prev) => {
      const updated = [...prev];
      updated[currentIndex] = optionIndex;
      return updated;
    });

    // setTimeout(() => {
    //   if (currentIndex + 1 < questions.length) {
    //     setCurrentIndex(currentIndex + 1);
    //   } else {
    //     setFinished(true);
    //   }
    // }, 600);
  };

  const handleNextQuestion = () => {
    socket.emit("next-question", { roomId, queindex: currentIndex + 1, userId: user?.id, isCorrect });

    setCurrentIndex((prev) => prev + 1)
    if (currentIndex >= 10) {
      setCurrentIndex(0);
    };
  };

  // Handle result page navigation
  const handleResult = () => {
    router.push(`/room/${roomId}/${owner}`);
  };

  return (
    <div className="min-h-screen bg-white text-black px-4 py-6 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        {/* Owner clicks to load the quiz */}
        {user?.id === owner && (
          <button
            onClick={enterFullscreen}
            className="w-full py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-all"
          >
            Load Quiz
          </button>
        )}

        {/* Quiz section */}
        {!finished && question && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              {`Question ${currentIndex + 1} of ${quizLength}`}
            </h2>
            <p className="text-xl mb-4">{question?.q}</p>
            <ul className="space-y-2">
              {question?.opts.map((opt, idx) => {
                const isSelected = selected[currentIndex] === idx;
                const isCorrect = question.ans === idx;
                const isAnswered = selected[currentIndex] !== undefined;

                return (
                  <li
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className={cn(
                      "p-3 rounded-lg border transition-all cursor-pointer select-none",
                      isAnswered
                        ? isCorrect
                          ? "bg-green-200 border-green-500"
                          : isSelected
                            ? "bg-red-200 border-red-500"
                            : "bg-gray-100 border-gray-300"
                        : "hover:bg-yellow-100 border-gray-200"
                    )}
                  >
                    {opt}
                  </li>
                );
              })}
            </ul>
            <Button onClick={handleNextQuestion}>
              Next
            </Button>
          </div>
        )}

        {/* Finish page */}
        {finished && (
          <div className="text-center space-y-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="text-2xl font-bold">Quiz Completed</h2>
            <p className="text-lg font-semibold">
              Your score: {score} / {quizLength}
            </p>
            <button
              onClick={handleResult}
              className="mt-4 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all"
            >
              See Results
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
