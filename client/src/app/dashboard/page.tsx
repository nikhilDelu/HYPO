"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function RoomPage() {
  const date = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekdayName = days[date.getDay()];
  return (
    <main className="flex flex-col min-h-screen w-screen overflow-hidden">
      <div className="flex-grow-[1] flex justify-between border-b-2 border-black">
        <span className="w-[40%] flex items-center justify-center bg-black text-white text-4xl">
          HYPO
        </span>
        <div className="p-0 w-full flex justify-between border-black border-x-2 ">
          <span className="border-r-2 w-full h-full flex items-center justify-center border-black">
            Rule 1
          </span>
          <span className="border-r-2 w-full h-full flex items-center justify-center border-black">
            Rule 2
          </span>
          <span className="border-r-2 w-full h-full flex items-center justify-center border-black">
            Rule 3
          </span>
          <span className="border-r-2 w-full h-full flex items-center justify-center border-black">
            Rule 4
          </span>
          <span className=" border-black w-full h-full flex items-center justify-center">
            Rule 5
          </span>
        </div>
        <span className="w-[20%] flex items-center justify-center text-2xl">
          Enter
        </span>
      </div>
      <div className="flex-grow-[5] flex justify-between">
        <div className="w-full flex-grow[1] flex items-center justify-center p-2">
          <div className="border-1 border-black h-32 w-52"></div>
        </div>
        <div className="w-full flex-grow[1] text-9xl font-bold uppercase flex items-center justify-between">
          <div>{weekdayName}.</div>
          <div className="text-xs rotate-90 w-24 line-clamp-2 text-right text-wrap">
            Compete till win.
          </div>
        </div>
        <div className="w-full flex-grow[1] flex items-center justify-center gap-4 relative p-2">
          <div className="border-1 h-32 w-[36%] border-black"></div>
          <div className="border-1 h-32 w-[58%] border-black"></div>
        </div>
      </div>
      <div className="flex-grow-[12]"></div>
    </main>
  );
}
