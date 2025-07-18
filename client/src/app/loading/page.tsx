"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function Loading() {
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDone(true);
      router.push("/dashboard");
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (done) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-start overflow-hidden">
      {/* 🚜 Background Farmland Image */}
      <img
        src="/background-farmland.jpg"
        alt="Farmland"
        className="absolute inset-0 w-full h-full object-cover -z-10"
      />

      {/* 🛣️ Optional Road Image Overlay (transparent PNG) */}
      <img
        src="/image.png"
        alt="Road"
        className="absolute bottom-0 w-full h-screen object-cover z-10"
      />

      {/* 🚜 Tractor (animated) */}
      <motion.img
        src="/tractor.png"
        alt="Tractor"
        className="w-28 h-28 z-20"
        initial={{ x: "-100%" }}
        animate={{ x: "100vw" }}
        transition={{ duration: 4, ease: "easeInOut" }}
      />

      {/* ⏳ Loading Text */}
      <div className="absolute top-6 left-6 font-mono text-sm text-white drop-shadow-lg">
        Loading...
      </div>
    </div>
  );
}
