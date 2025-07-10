"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { io } from "socket.io-client";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
});

interface Question {
  question: string;
  options: [string, string, string, string];
  answer: number;
}

export default function QuizPage() {
  const [questions, setQuestions] = useState<Question[]>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const { roomId } = useParams();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const owner = searchParams.get("createdBy");
  const router = useRouter();
  function enterFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) {
      /* Safari */
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) {
      /* IE11 */
      (elem as any).msRequestFullscreen();
    }
    socket.emit("get-quiz", { roomId });
  }

  useEffect(() => {
    socket.emit("join-room", roomId);
    socket.on("questions", ({ questions }) => {
      setQuestions(questions);
    });
    return () => {
      socket.off("questions");
    };
  }, [roomId]);

  useEffect(() => {
    const handleBlur = () => {
      alert("Don't switch tabs during the quiz!");
      // or increment a counter, disqualify, etc.
    };
    window.addEventListener("blur", handleBlur);

    return () => window.removeEventListener("blur", handleBlur);
  }, []);

  window.onbeforeunload = (e) => {
    e.preventDefault();
    e.returnValue = ""; // Show default browser confirmation
  };

  useEffect(() => {
    const disableShortcuts = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey &&
          ["u", "s", "c", "v", "r"].includes(e.key.toLowerCase())) ||
        e.key === "F12" ||
        e.key === "esc"
      ) {
        e.preventDefault();
      }
    };

    // const disableRightClick = (e: MouseEvent) => e.preventDefault();

    document.addEventListener("keydown", disableShortcuts);
    //  document.addEventListener("contextmenu", disableRightClick);

    return () => {
      document.removeEventListener("keydown", disableShortcuts);
      //  document.removeEventListener("contextmenu", disableRightClick);
    };
  }, []);

  const handleAnswer = (index: number) => {
    if (!questions) return;
    const correct = questions[currentIndex].answer === index;
    if (correct) setScore((s) => s + 1);

    setSelected([...selected, index]);

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setFinished(true);
      }
    }, 600);
  };

  const handleResult = () => {
    router.push(`/room/${roomId}/${owner}`);
  };

  const progress = questions
    ? ((currentIndex + Number(finished)) / questions.length) * 100
    : 0;

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl p-6 rounded-2xl border shadow-lg space-y-6">
        <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {!questions ? (
          <div className="text-center text-gray-500">
            Waiting for admin to start...
          </div>
        ) : finished ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <h1 className="text-2xl font-bold">Quiz Finished</h1>
            <p className="text-gray-700">
              Your score: {score} / {questions.length}
            </p>
            <button
              onClick={() => handleResult()}
              className="mt-6 w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition-all"
            >
              Go to Room
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-lg text-gray-600 mb-2">
              Question {currentIndex + 1} of {questions.length}
            </h2>
            <h1 className="text-xl md:text-2xl font-semibold mb-6">
              {questions[currentIndex].question}
            </h1>
            <div className="space-y-3">
              {questions[currentIndex].options.map((opt, i) => (
                <div
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className={cn(
                    "cursor-pointer border rounded-lg px-4 py-3 transition-all",
                    selected.length > currentIndex
                      ? i === questions[currentIndex].answer
                        ? "bg-green-100 border-green-500"
                        : i === selected[currentIndex]
                        ? "bg-red-100 border-red-500"
                        : "bg-white"
                      : "hover:bg-gray-100"
                  )}
                >
                  {opt}
                </div>
              ))}
            </div>
          </div>
        )}

        {user?.id === owner && !questions && (
          <button
            onClick={() => enterFullscreen()}
            className="mt-6 w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition-all"
          >
            Load Quiz
          </button>
        )}
      </div>
    </div>
  );
}
