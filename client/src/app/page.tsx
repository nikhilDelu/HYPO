import Link from "next/link";
import { Button } from "../components/ui/button";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-4xl font-bold">Quiz Collab 🤝</h1>
      <p className="text-muted-foreground text-center">
        Collaborate with friends in real-time quizzes, chat, and polls!
      </p>

      <SignedOut>
        <div className="flex gap-4">
          <Link href="/sign-in">
            <Button>Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button variant="outline">Sign Up</Button>
          </Link>
        </div>
      </SignedOut>

      <SignedIn>
        <Link href="/dashboard">
          <Button>Go to Dashboard</Button>
        </Link>
      </SignedIn>
    </main>
  );
}
