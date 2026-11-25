"use client";

import { GameResult, SerializedGame } from "@/types";
import { FormEvent, useState } from "react";

export type GameDeckOption = {
  _id: string;
  name: string;
  format: string;
  link?: string;
};

type GameFormModalProps = {
  decks?: GameDeckOption[];
  initialDeck?: GameDeckOption;
  game?: SerializedGame;
  lockDeck?: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function GameFormModal({ decks = [], initialDeck, game, lockDeck, onClose, onSaved }: GameFormModalProps) {
  const editingGameId = game?._id;
  const [date, setDate] = useState(() => game?.date ?? new Date().toISOString().slice(0, 10));
  const [deckId, setDeckId] = useState(game?.deckId ?? initialDeck?._id ?? "");
  const [deckName, setDeckName] = useState(game?.deckName ?? initialDeck?.name ?? "");
  const [deckLink, setDeckLink] = useState(game?.deckLink ?? initialDeck?.link ?? "");
  const [format, setFormat] = useState(game?.format ?? initialDeck?.format ?? "");
  const [result, setResult] = useState<GameResult>(game?.result ?? "win");
  const [numPlayers, setNumPlayers] = useState(game?.numPlayers ?? 4);
  const [turnNumber, setTurnNumber] = useState(game?.turnNumber?.toString() ?? "");
  const [notes, setNotes] = useState(game?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const chooseDeck = (selectedDeckId: string) => {
    setDeckId(selectedDeckId);
    const selectedDeck = decks.find(deck => deck._id === selectedDeckId);
    if (!selectedDeck) return;
    setDeckName(selectedDeck.name);
    setDeckLink(selectedDeck.link ?? "");
    setFormat(selectedDeck.format);
  };

  const close = () => {
    if (!saving) onClose();
  };

  const saveGame = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");

    const errorMessage = editingGameId ? "Could not update game" : "Could not add game";
    try {
      const res = await fetch(editingGameId ? `/api/games/${editingGameId}` : "/api/games", {
        method: editingGameId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          deckId: deckId || undefined,
          deckName,
          deckLink,
          format,
          result,
          numPlayers,
          turnNumber: turnNumber ? Number(turnNumber) : null,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? errorMessage);
    } catch (error) {
      setError(error instanceof Error ? error.message : errorMessage);
      setSaving(false);
      return;
    }

    onClose();
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={close}
    >
      <form
        onSubmit={saveGame}
        role="dialog" aria-modal="true" aria-labelledby="game-form-title"
        className="collection-card-modal max-h-[90vh] w-[90%] max-w-xl overflow-y-auto rounded bg-white p-5 text-black shadow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="game-form-title" className="text-xl font-semibold">{editingGameId ? "Edit Game" : "Add Game"}</h2>
          <button type="button" disabled={saving} onClick={close} aria-label="Close game form" className="text-xl">x</button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded border p-2" required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Deck</span>
            <select disabled={lockDeck} value={deckId} onChange={(e) => chooseDeck(e.target.value)} className="w-full rounded border p-2">
              {lockDeck ? (
                <option value={deckId}>{initialDeck?.name}</option>
              ) : (
                <>
                  <option value="">Manual deck</option>
                  {decks.map(deck => (
                    <option key={deck._id} value={deck._id}>{deck.name}</option>
                  ))}
                </>
              )}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Deck name</span>
            <input type="text" value={deckName} onChange={(e) => setDeckName(e.target.value)} className="w-full rounded border p-2" required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Format</span>
            <input type="text" value={format} onChange={(e) => setFormat(e.target.value)} className="w-full rounded border p-2" required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Result</span>
            <select value={result} onChange={(e) => setResult(e.target.value as GameResult)} className="w-full rounded border p-2">
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="tie">Tie</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Number of players</span>
            <input type="number" min={1} value={numPlayers} onChange={(e) => setNumPlayers(Math.max(1, Number(e.target.value)))} className="w-full rounded border p-2" required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Turn number</span>
            <input type="number" min={1} value={turnNumber} onChange={(e) => setTurnNumber(e.target.value)} className="w-full rounded border p-2" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Deck link</span>
            <input type="url" value={deckLink} onChange={(e) => setDeckLink(e.target.value)} className="w-full rounded border p-2" />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium">Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-28 w-full resize-y rounded border p-2" />
        </label>

        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" disabled={saving} onClick={close} className="rounded border border-gray-300 px-4 py-2 hover:bg-gray-100">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:bg-gray-400">
            {saving ? "Saving..." : editingGameId ? "Save Changes" : "Save Game"}
          </button>
        </div>
      </form>
    </div>
  );
}
