"use client";
import authorization from "@/authorization";
import RegalsMagicHeader from "@/components/RegalsMagicHeader";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function Decks() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [owner, setOwner] = useState("");
  const [format, setFormat] = useState("");
  const [colorId, setColorId] = useState("");

  if (sessionStatus === "loading") {
    return (
      <p>Loading...</p>
    )
  }

  if (!session || !authorization.canAddDecks(session.user?.permissionLevel)) {
    redirect("/login");
  }  

  return (
    <div className="flex flex-col min-h-screen bg-teal-900">
      <RegalsMagicHeader isHome={false} />

      <main className="flex-1 px-4 text-center justify-items-center">        
        <form 
          onSubmit={ async ( e: FormEvent ) => {
            e.preventDefault();

            const deck = {
              name,
              link,
              owner,
              format,
              colorId,
            }

            try {
              const res = await fetch(`/api/decks/add_deck`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(deck)
              });

              if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
              }

              const { objId } = await res.json();

              router.push(`/decks/${ objId }`);
            } catch (error) {
              console.error("Error adding deck:", error);
              alert(`Failed to add deck: ${error}`);
            }
            return;
          }} 
          className="max-w-md mx-auto bg-white p-6 rounded shadow space-y-4 text-black"
        >
          <h2 className="text-xl font-semibold mb-4 text-black">Add a New Deck</h2>

          <input
            type="text"
            placeholder="Deck Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />

          <input
            type="url"
            placeholder="Link (optional)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="w-full p-2 border rounded"
          />

          <input
            type="text"
            placeholder="Owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />

          <input
            type="text"
            placeholder="Format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />

          <input
            type="text"
            placeholder="Color Identity (optional)"
            value={colorId}
            onChange={(e) => setColorId(e.target.value)}
            className="w-full p-2 border rounded"
          />

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"
          >
            Add Deck
          </button>
        </form>
      </main>
    </div>
  )
}