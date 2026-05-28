"use client";

import authorization from "@/authorization";
import RegalsMagicHeader from "@/components/RegalsMagicHeader";
import { Deck } from "@/types";
import { useSession } from "next-auth/react";
import { redirect, useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const colorOptions = [
  { id: "W", label: "W", className: "bg-[#f8f0d8] text-black" },
  { id: "U", label: "U", className: "bg-[#4aa3df] text-white" },
  { id: "B", label: "B", className: "bg-[#312a2c] text-white" },
  { id: "R", label: "R", className: "bg-[#d9482f] text-white" },
  { id: "G", label: "G", className: "bg-[#3d8b4f] text-white" },
];

const colorOrder = ["W", "U", "B", "R", "G"];

function normalizeColorId(colorId: string) {
  const selected = new Set(colorId.toUpperCase().split(""));
  return colorOrder.filter(color => selected.has(color)).join("");
}

export default function DeckSettings() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { deck_id: deckId } = useParams();

  const [loadingDeck, setLoadingDeck] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [owner, setOwner] = useState("");
  const [format, setFormat] = useState("");
  const [colorId, setColorId] = useState("");

  useEffect(() => {
    if (!deckId) return;

    async function fetchDeck() {
      try {
        const res = await fetch(`/api/decks/${deckId}`);
        if (!res.ok) throw new Error("Failed to fetch deck");
        const { foundDeck }: { foundDeck: Deck } = await res.json();

        setName(foundDeck.name);
        setLink(foundDeck.link ?? "");
        setOwner(foundDeck.owner);
        setFormat(foundDeck.format);
        setColorId(foundDeck.colorId ?? "");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to fetch deck");
      } finally {
        setLoadingDeck(false);
      }
    }

    fetchDeck();
  }, [deckId]);

  if (sessionStatus === "loading" || loadingDeck) {
    return <p>Loading...</p>;
  }

  if (!session || !authorization.canAddDecks(session.user?.permissionLevel)) {
    redirect("/login");
  }

  const toggleColor = (color: string) => {
    setColorId(current => {
      const selected = new Set(current.split(""));
      if (selected.has(color)) {
        selected.delete(color);
      } else {
        selected.add(color);
      }

      return normalizeColorId([...selected].join(""));
    });
  };

  const saveDeck = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/decks/${deckId}/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          link,
          owner,
          format,
          colorId,
        }),
      });

      if (!res.ok) throw new Error("Failed to save deck settings");
      router.push(`/decks/${deckId}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save deck settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-teal-900">
      <RegalsMagicHeader
        showBack={true}
        backUrl={`/decks/${deckId}`}
        backText="Back to deck"
      />

      <main className="flex-1 px-4 py-6">
        <form
          onSubmit={saveDeck}
          className="max-w-2xl mx-auto bg-white p-6 rounded shadow space-y-5 text-black"
        >
          <div>
            <h1 className="text-2xl font-semibold">Deck Settings</h1>
            <p className="text-sm text-gray-600">Edit the details shown on the deck list and deck page.</p>
          </div>

          {error && (
            <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Deck name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Owner</span>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">Format</span>
              <input
                type="text"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Deck link</span>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="https://moxfield.com/decks/..."
            />
          </label>

          <div>
            <span className="mb-2 block text-sm font-medium">Color identity</span>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map(color => {
                const selected = colorId.includes(color.id);

                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => toggleColor(color.id)}
                    className={`h-10 w-10 rounded-full border-2 font-semibold ${color.className} ${selected ? "border-indigo-600 ring-2 ring-indigo-300" : "border-gray-300"}`}
                  >
                    {color.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setColorId("")}
                className="h-10 rounded border border-gray-300 px-3 text-sm hover:bg-gray-100"
              >
                Colorless
              </button>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.push(`/decks/${deckId}`)}
              className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
