"use client";
import authorization from "@/authorization";
import RegalsMagicHeader from "@/components/RegalsMagicHeader";
import { Deck } from "@/types";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Decks() {
  const { data: session, status: sessionStatus } = useSession();

  // Deck information
  const [ decks, setDecks ] = useState<Deck[]>([]);
  const [ loadingDecks, setLoadingDecks ] = useState<boolean>(true);

  useEffect(() => {
    async function fetchDecks() {
      try {
        let res = await fetch("/api/decks/all_decks");
        const { allDecks } = await res.json();
        setDecks(allDecks);
      } catch(error) {
        console.error("Failed to fetch decks", error);
      } finally {
        setLoadingDecks(false);
      }
    }

    fetchDecks();
  }, []);

  if (sessionStatus === "loading" || loadingDecks) {
    return (
      <p>Loading...</p>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-teal-900">
      <RegalsMagicHeader
        showBack={true}
        backUrl="/"
        backText="Home"
      />

      <main className="flex-1 px-4 text-center justify-items-center">
        {session && authorization.canAddDecks(session.user?.permissionLevel) && 
          <Link href="/decks/new" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">New Deck</Link>
        }

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center mt-5">
          {decks.map((deck, index) => (
            <a href={`/decks/${deck._id?.toString()}`} key={index} className="bg-teal-100 rounded-lg shadow-md p-4 w-58 flex flex-col text-black">
              <p>{deck.name}</p>
            </a>
          ))}
        </div>
      </main>
    </div>
  )
}