"use client";

import authorization from "@/authorization";
import RegalsMagicHeader from "@/components/RegalsMagicHeader";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

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

export default function NewDeck() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [owner, setOwner] = useState("");
  const [format, setFormat] = useState("");
  const [colorId, setColorId] = useState("");
  const [mainForColorIdentity, setMainForColorIdentity] = useState(false);
  const [together, setTogether] = useState(true);

  if (sessionStatus === "loading") {
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

  const createDeck = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/decks/add_deck", {
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
          mainForColorIdentity,
          together,
        }),
      });

      if (!res.ok) throw new Error("Failed to create deck");

      const { objId } = await res.json();
      router.push(`/decks/${objId}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create deck");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-teal-900">
      <RegalsMagicHeader
        showBack={true}
        backUrl="/decks"
        backText="Decks"
      />

      <main className="flex-1 px-4 py-6">
        <form
          onSubmit={createDeck}
          className="max-w-2xl mx-auto bg-white p-6 rounded shadow space-y-5 text-black"
        >
          <div>
            <h1 className="text-2xl font-semibold">New Deck</h1>
            <p className="text-sm text-gray-600">Create a deck and choose how it appears in the deck overview.</p>
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

          <label className="flex items-start gap-3 rounded border border-gray-200 bg-gray-50 p-3">
            <input
              type="checkbox"
              checked={mainForColorIdentity}
              onChange={(e) => setMainForColorIdentity(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-medium">Main deck for this color identity</span>
              <span className="block text-sm text-gray-600">
                Show this deck in the EDH color overview. Other decks with the same format and colors will be listed below it.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded border border-gray-200 bg-gray-50 p-3">
            <input
              type="checkbox"
              checked={together}
              onChange={(e) => setTogether(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-medium">Currently built</span>
              <span className="block text-sm text-gray-600">
                Show this deck with your active built decks.
              </span>
            </span>
          </label>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.push("/decks")}
              className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {saving ? "Creating..." : "Create Deck"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
