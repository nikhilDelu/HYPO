"use client";
import { useEffect, useState } from "react";

const page = () => {
  const [loading, setLoading] = useState<boolean>(false);
  useEffect(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 5000);
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      {loading ? "Loading..." : <div>Quiz Here Mate!</div>}
    </div>
  );
};

export default page;
