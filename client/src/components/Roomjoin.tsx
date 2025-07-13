import React, { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

function Roomjoin() {
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const router = useRouter();
  const { getToken } = useAuth();

  const handleCreate = async () => {
    if (!roomName.trim()) {
      toast.error("Room name is required");
      return;
    }
    getToken().then((token) => {
      if (!token) {
        toast.error("Unable to retrieve Clerk token");
        return;
      }
      fetch("http://localhost:5000/api/rooms", {
        method: "POST",
        body: JSON.stringify({ name: roomName }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.roomId) {
            router.push(`/dashboard/${data.roomId}/${data.createdBy}`);
          }
        })
        .catch((err) => {
          console.error("Error:", err);
          toast.error("Something went wrong");
        });
    });
  };
  const handleJoin = () => {
    if (!joinCode.trim()) {
      toast.error("Enter a valid code");
      return;
    }
    router.push(`/dashboard/${joinCode}`);
  };

  return (
    <div className="flex flex-col w-full justify-center items-center">
      <h1 className="text-3xl font-bold">Quiz Room</h1>

      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Create a Room</h2>
          <Input
            placeholder="Room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <Button onClick={handleCreate} className="w-full">
            Create Room
          </Button>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <h2 className="text-xl font-semibold">Join a Room</h2>
          <Input
            placeholder="Enter room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <Button onClick={handleJoin} variant="secondary" className="w-full">
            Join Room
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Roomjoin;
