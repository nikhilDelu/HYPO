import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default function DashboardPage() {
  const user = auth();
  if (!user) {
    redirect("sign-in");
  }
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1>Welcome to Quiz Collab 🎯</h1>
      <UserButton afterSignOutUrl="/" />
      <p className="mt-4 text-muted-foreground">
        <Button asChild>
          <Link href={"/room"}>Go To Room</Link>
        </Button>
      </p>
    </div>
  );
}
