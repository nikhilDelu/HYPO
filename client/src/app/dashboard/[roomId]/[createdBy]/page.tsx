"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { toast } from "sonner";
import TerminalInput from "@/components/Tinput";

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
  const [users, setUsers] = useState([]);

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
    <div className="flex  max-h-screen overflow-hidden h-screen bg-black p-4">
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
      <div className="h-full w-[40%] border-r-1 border-black bg-[#d4dad3] flex flex-col">
        {users.map((u, index) => (
          <div
            className="border-b-1 border-black p-2 h-full font-mono"
            key={index}
          >
            {u && u?.username}
          </div>
        ))}
      </div>
      {/* Actions/info */}
      <div className="w-full h-full  flex flex-col items-center bg-amber-400 justify-center p-2">
        {loading && (
          <div>
            <div className="flex items-center justify-center h-full w-full">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent border-black" />
            </div>
          </div>
        )}
        {!desc && !loading ? (
          <div>{"desc"}</div>
        ) : (
          !loading && <div>No Description Yet!</div>
        )}
      </div>
      {/* chat */}
      <div className="w-[30%] h-full p-2 flex flex-col gap-6 justify-between bg-[#d4dad3] cursor-cell ">
        <h1 className="text-2xl font-bold mb-4  overflow-ellipsis line-clamp-1 max-w-full">
          Room: {roomId}/{createdBy}
        </h1>
        {user?.id == createdBy && (
          <div className="flex gap-2 w-full max-w-xl ">
            <Input
              disabled={loading}
              className="rounded-none "
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
        <div className="w-full max-w-xl h-80 border p-4 overflow-y-auto mb-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`${
                msg.user.id === user?.id && "ml-auto"
              } mb-2 w-fit font-mono capitalize text-black p-1 px-2 text-sm`}
            >
              <strong>{msg.user.id === user?.id ? "" : msg.user.name}</strong>{" "}
              {msg.message}
            </div>
          ))}
        </div>
        <TerminalInput
          onSend={(msg) => {
            console.log("Sending:", msg);
            sendMessage();
          }}
        />
      </div>
    </div>
  );
}

// "use client";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { useAuth, useUser } from "@clerk/nextjs";
// import { useRouter, useParams } from "next/navigation";
// import { useEffect, useState, useRef } from "react";
// import { io } from "socket.io-client";
// import axios from "axios";
// import { toast } from "sonner";

// const socket = io("http://localhost:5000", {
//   transports: ["websocket"],
// });

// export default function RoomView() {
//   const { roomId, createdBy } = useParams();
//   const { getToken } = useAuth();
//   const router = useRouter();
//   const messagesEndRef = useRef<HTMLDivElement>(null);

//   const [messages, setMessages] = useState<
//     { message: string; user: { id: string; name: string } }[]
//   >([]);
//   const [desc, setDesc] = useState<string>();
//   const [loading, setLoading] = useState<boolean>(false);
//   const [subject, setSubject] = useState<string>("");
//   const [input, setInput] = useState("");
//   const { user } = useUser();

//   const username = user?.fullName;
//   const userId = user?.id;
//   const isCreator = user?.id === createdBy;

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     if (!roomId) return;
//     socket.emit("join-room", roomId);
//     return () => {
//       socket.off("poll-started");
//       socket.off("poll-updated");
//       socket.off("poll-ended");
//     };
//   }, [roomId]);

//   useEffect(() => {
//     if (!roomId) return;

//     socket.emit("join-room", roomId);

//     socket.on("quiz-started", () => {
//       router.push(`/quiz/${roomId}?createdBy=${createdBy}`);
//     });

//     socket.on("chat-message", ({ message, user }) => {
//       setMessages((prev) => [...prev, { message, user }]);
//     });

//     getToken()
//       .then((token) => {
//         return fetch(`http://localhost:5000/api/messages/${roomId}`, {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });
//       })
//       .then((res) => res.json())
//       .then((data) => {
//         setMessages(data);
//       });

//     return () => {
//       socket.off("chat-message");
//     };
//   }, [roomId]);

//   const sendMessage = () => {
//     if (!input.trim()) return;
//     socket.emit("chat-message", {
//       roomId,
//       message: input,
//       user: {
//         id: userId,
//         name: username,
//       },
//     });
//     setInput("");
//   };

//   const getQuiz = async () => {
//     if (!subject.trim()) {
//       toast.error("Please enter a subject");
//       return;
//     }

//     try {
//       setLoading(true);
//       const response = await axios.post("http://localhost:5000/api/quiz", {
//         sub: subject,
//         createdBy,
//         roomId,
//       });

//       setDesc(response.data.desc);
//       setSubject("");
//     } catch (err) {
//       toast.error("Failed to generate quiz");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const startQuiz = () => {
//     socket.emit("start", { roomId });
//   };

//   return (
//     <div className="h-screen flex flex-col">
//       {/* Header */}
//       <header className="flex items-center justify-between px-6 py-4 border-b">
//         <div className="flex items-center space-x-8">
//           <h1 className="font-medium">Room {roomId}</h1>
//           <span className="text-sm text-gray-600">Host: {createdBy}</span>
//         </div>
//         {desc && (
//           <Button onClick={startQuiz} size="sm">
//             Start Quiz
//           </Button>
//         )}
//       </header>

//       <div className="flex flex-1 min-h-0">
//         {/* Sidebar */}
//         <aside className="w-72 border-r">
//           <div className="p-6">
//             <h2 className="font-medium mb-6">Quiz Setup</h2>

//             {isCreator && (
//               <div className="space-y-4 mb-8">
//                 <div>
//                   <label className="block text-sm text-gray-700 mb-2">
//                     Subject
//                   </label>
//                   <Input
//                     value={subject}
//                     onChange={(e) => setSubject(e.target.value)}
//                     onKeyDown={(e) =>
//                       e.key === "Enter" && !loading && getQuiz()
//                     }
//                     placeholder="Enter quiz subject"
//                     disabled={loading}
//                   />
//                 </div>
//                 <Button
//                   onClick={getQuiz}
//                   disabled={loading || !subject.trim()}
//                   variant="outline"
//                   size="sm"
//                   className="w-full bg-transparent"
//                 >
//                   {loading ? "Generating..." : "Generate Quiz"}
//                 </Button>
//               </div>
//             )}

//             <div>
//               <h3 className="text-sm text-gray-700 mb-3">Status</h3>
//               {loading ? (
//                 <p className="text-sm text-gray-600">Generating quiz...</p>
//               ) : desc ? (
//                 <div className="space-y-2">
//                   <p className="text-sm font-medium text-green-700">Ready</p>
//                   <p className="text-sm text-gray-600 leading-relaxed">
//                     {desc}
//                   </p>
//                 </div>
//               ) : (
//                 <p className="text-sm text-gray-500">
//                   {isCreator ? "No quiz generated" : "Waiting for host"}
//                 </p>
//               )}
//             </div>
//           </div>
//         </aside>

//         {/* Main Chat Area */}
//         <main className="flex-1 flex flex-col">
//           {/* Messages */}
//           <div className="flex-1 overflow-y-auto">
//             {messages.length === 0 ? (
//               <div className="flex items-center justify-center h-full text-gray-500">
//                 <p>No messages yet</p>
//               </div>
//             ) : (
//               <div className="p-6 space-y-6">
//                 {messages.map((msg, idx) => (
//                   <div key={idx}>
//                     <div className="flex items-baseline space-x-2 mb-1">
//                       <span className="font-medium text-sm">
//                         {msg.user.id === user?.id ? "You" : msg.user.name}
//                       </span>
//                       <span className="text-xs text-gray-500">now</span>
//                     </div>
//                     <p className="text-gray-900">{msg.message}</p>
//                   </div>
//                 ))}
//                 <div ref={messagesEndRef} />
//               </div>
//             )}
//           </div>

//           {/* Message Input */}
//           <div className="border-t p-4">
//             <div className="flex space-x-3">
//               <Input
//                 value={input}
//                 onChange={(e) => setInput(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && sendMessage()}
//                 placeholder="Type a message..."
//                 className="flex-1"
//               />
//               <Button onClick={sendMessage} disabled={!input.trim()} size="sm">
//                 Send
//               </Button>
//             </div>
//           </div>
//         </main>
//       </div>
//     </div>
//   );
// }
