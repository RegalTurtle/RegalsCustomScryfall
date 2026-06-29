"use client";
import RegalsMagicHeader from "@/components/RegalsMagicHeader";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") return <p>Loading...</p>;

  return (
    <div className="flex flex-col bg-teal-900 h-dvh min-h-screen">
      <RegalsMagicHeader 
        showBack={false}
        backUrl=""
        backText="" 
      />

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <h2 className="text-2xl mb-6">A hub of tools for RegalTurtle</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
          <Link href="/custom" className="bg-white text-teal-900 p-4 rounded-lg shadow hover:bg-teal-100">
            Search Custom Cards
          </Link>
          <Link href="/decks" className="bg-white text-teal-900 p-4 rounded-lg shadow hover:bg-teal-100">
            Decks
          </Link>
          <Link href="/games" className="bg-white text-teal-900 p-4 rounded-lg shadow hover:bg-teal-100">
            Index Games
          </Link>
          <Link href="/collection" className="bg-white text-teal-900 p-4 rounded-lg shadow hover:bg-teal-100">
            Collection
          </Link>
        </div>
      </main>

      <footer className="h-16 bg-gray-900 text-white flex items-center justify-center">
      </footer>
    </div>
  );
}

/* 
// app/dashboard/page.tsx (or any server component)
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth-options";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <p>You must be signed in to view this page.</p>;
  }

  return <p>Welcome, {session.user?.email}!</p>;
}

*/
