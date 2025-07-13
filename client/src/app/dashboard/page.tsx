"use client";
import Roomjoin from "@/components/Roomjoin";
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
        <span className="w-[40%] flex items-center justify-center bg-black text-white text-4xl font-bold">
          HYPO
        </span>
        <div className="p-0 w-full flex justify-between border-black border-x-2 ">
          <span className="border-r-2 w-full h-full flex items-center justify-center border-black hover:text-[#d4dad3] hover:bg-black transition-all duration-150 cursor-pointer">
            Rule 1
          </span>
          <span className="border-r-2 w-full h-full flex items-center justify-center border-black hover:text-[#d4dad3] hover:bg-black transition-all duration-150 cursor-pointer">
            Rule 2
          </span>
          <span className="border-r-2 w-full h-full flex items-center justify-center border-black hover:text-[#d4dad3] hover:bg-black transition-all duration-150 cursor-pointer">
            Rule 3
          </span>
          <span className="border-r-2 w-full h-full flex items-center justify-center border-black hover:text-[#d4dad3] hover:bg-black transition-all duration-150 cursor-pointer">
            Rule 4
          </span>
          <span className=" border-black w-full h-full flex items-center justify-center hover:text-[#d4dad3] hover:bg-black transition-all duration-150 cursor-pointer">
            Rule 5
          </span>
        </div>
        <span className="w-[20%] cursor-pointer flex items-center justify-center text-2xl">
          Enter
        </span>
      </div>
      <div className="flex-grow-[5] flex justify-between">
        <div className="w-full flex-grow[1] flex items-center justify-center p-2">
          <div className="cursor-pointer hover:scale-105 transition-all duration-150 border-1 border-gray-500 h-32 w-[80%] min-w-40 max-w-64 relative flex flex-col p-2 gap-1">
            <div className="">
              <div className="flex justify-between items-center ">
                <div className="text-xs">WORLDWIDE (SX)</div>
                <div className="text-xs font-extrabold italic">HYPO</div>
              </div>
              <div className="text-[4px] flex flex-col">
                <span>DEPARTMENT 04</span>
                <span>Ca21-01</span>
              </div>
            </div>
            <div className="w-full h-full mb-8 flex flex-col">
              <div className="flex justify-between">
                <div className="border-l-1 border-t-1 border-black size-2"></div>
                <div className="border-r-1 border-t-1 border-black size-2"></div>
              </div>
              <div className="h-full -mt-1 -mb-1 p-[2px] px-2">
                <div className="flex flex-col leading-tight">
                  <span className="text-[8px] font-semibold">Yash Bishnoi</span>
                  <span className="text-[4px]">Score: 69</span>
                </div>
              </div>
              <div className="flex justify-between">
                <div className="border-l-1 border-b-1 border-black size-2"></div>
                <div className="border-r-1 border-b-1 border-black size-2"></div>
              </div>
            </div>
          </div>
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
      <div className="flex-grow-[12] flex justify-center items-center">
        <Roomjoin />
      </div>
    </main>
  );
}
