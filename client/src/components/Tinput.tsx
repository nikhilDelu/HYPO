"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";

export default function TerminalInput({
  onSend,
}: {
  onSend: (msg: string) => void;
}) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const currentInput = useRef<string>("");

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      fontFamily: "monospace",
      fontSize: 16,
      theme: {
        background: "#000000", // Terminal black
        foreground: "#00FF00", // Terminal green
        cursor: "#00FF00",
      },
    });

    term.open(terminalRef.current!);
    term.focus();
    term.write("> ");
    termRef.current = term;

    term.onData((data) => {
      const char = data.charCodeAt(0);

      if (char === 13) {
        // ENTER
        const input = currentInput.current.trim();
        if (input) {
          onSend(input);
        }
        term.write("\r\n> ");
        currentInput.current = "";
      } else if (char === 127) {
        // BACKSPACE
        if (currentInput.current.length > 0) {
          currentInput.current = currentInput.current.slice(0, -1);
          term.write("\b \b");
        }
      } else {
        currentInput.current += data;
        term.write(data);
      }
    });

    return () => {
      term.dispose();
    };
  }, [onSend]); // ✅ Only re-run if `onSend` changes

  return (
    <div className="w-full max-w-xl h-16 rounded border border-gray-400 overflow-hidden">
      <div
        ref={terminalRef}
        className="w-full h-full"
        style={{
          backgroundColor: "#000000",
        }}
      />
    </div>
  );
}
