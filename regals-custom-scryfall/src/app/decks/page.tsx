"use client";
import authorization from "@/authorization";
import RegalsMagicHeader from "@/components/RegalsMagicHeader";
import { Deck } from "@/types";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

const manaColors: Record<string, string> = {
  W: "#f8f0d8",
  U: "#4aa3df",
  B: "#312a2c",
  R: "#d9482f",
  G: "#3d8b4f",
};

function deckBorderStyle(colorId?: string): React.CSSProperties {
  const colors = [...new Set((colorId ?? "").toUpperCase().split(""))]
    .map(color => manaColors[color])
    .filter(Boolean);

  if (colors.length === 0) return {};

  return {
    background: colors.length === 1
      ? colors[0]
      : `linear-gradient(135deg, ${colors.join(", ")})`,
  };
}

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 justify-items-stretch mt-5 w-full max-w-5xl mx-auto">
          {decks.map((deck, index) => (
            <Link
              href={`/decks/${deck._id?.toString()}`}
              key={index}
              className="rounded-lg shadow-md p-2 w-full text-black"
              style={deckBorderStyle(deck.colorId)}
            >
              <div className="bg-teal-100 rounded-md p-4 h-full flex flex-col gap-1">
                <p className="font-semibold">{deck.name}</p>
                <p className="text-sm">{deck.format}</p>
                <p className="text-sm">Owner: {deck.owner}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
