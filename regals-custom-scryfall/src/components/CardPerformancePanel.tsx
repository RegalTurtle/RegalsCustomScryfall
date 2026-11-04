"use client";

import { Card, CardPerformanceRating, CardPerformanceSummary, Game, SerializedCardPerformanceNote } from "@/types";
import { useEffect, useState } from "react";

export default function CardPerformancePanel({ card, deckId, onChanged }: { card: Card; deckId: string; onChanged?: () => void }) {
  const [notes, setNotes] = useState<SerializedCardPerformanceNote[]>([]);
  const [summary, setSummary] = useState<CardPerformanceSummary>({ good: 0, poor: 0, score: 0 });
  const [games, setGames] = useState<Array<Game & { _id: string }>>([]);
  const [gameId, setGameId] = useState("");
  const [rating, setRating] = useState<CardPerformanceRating>("good");
  const [noteText, setNoteText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [performanceResponse, gamesResponse] = await Promise.all([
        fetch(`/api/card-performance?set=${encodeURIComponent(card.set)}&cn=${encodeURIComponent(card.cn)}&deckId=${encodeURIComponent(deckId)}`),
        fetch(`/api/games?deckId=${encodeURIComponent(deckId)}&limit=500`),
      ]);
      const performanceData = await performanceResponse.json();
      const gamesData = await gamesResponse.json();
      if (!performanceResponse.ok) throw new Error(performanceData.error ?? "Could not load performance notes");
      setNotes(performanceData.notes ?? []);
      setSummary(performanceData.summary ?? { good: 0, poor: 0, score: 0 });
      setGames(gamesData.games ?? []);
      if (!gameId && gamesData.games?.[0]?._id) setGameId(gamesData.games[0]._id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load performance notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [card.set, card.cn, deckId]);

  const save = async () => {
    if (!gameId) {
      setError("Choose a game first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/card-performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardName: card.name, set: card.set, cn: card.cn, deckId, gameId, rating, notes: noteText }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save performance note");
      setNoteText("");
      await load();
      window.dispatchEvent(new Event("card-performance-updated"));
      onChanged?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save performance note");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const response = await fetch(`/api/card-performance?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) {
      await load();
      window.dispatchEvent(new Event("card-performance-updated"));
      onChanged?.();
    }
  };

  return (
    <div className="w-full rounded bg-gray-700 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Game performance</h3>
        <span className={summary.score > 0 ? "text-green-300" : summary.score < 0 ? "text-red-300" : "text-gray-200"}>
          {summary.score > 0 ? "▲" : summary.score < 0 ? "▼" : "•"} {Math.abs(summary.score)}
        </span>
      </div>
      {loading ? <p className="text-sm text-gray-300">Loading performance notes...</p> : (
        <>
          <div className="flex flex-col gap-2">
            <select value={gameId} onChange={event => setGameId(event.target.value)} className="rounded bg-gray-800 px-2 py-1 text-sm text-white">
              <option value="">Choose the game</option>
              {games.map(game => <option key={game._id} value={game._id}>{game.date} · {game.deckName} · {game.result}</option>)}
            </select>
            <div className="flex gap-2">
              <select value={rating} onChange={event => setRating(event.target.value as CardPerformanceRating)} className="rounded bg-gray-800 px-2 py-1 text-sm text-white">
                <option value="good">Performed well ▲</option>
                <option value="poor">Performed poorly ▼</option>
              </select>
              <button onClick={save} disabled={saving || !gameId} className="flex-1 rounded bg-indigo-700 px-3 py-1 text-sm hover:bg-indigo-600 disabled:bg-gray-500">
                {saving ? "Saving..." : "Save note"}
              </button>
            </div>
            <textarea value={noteText} onChange={event => setNoteText(event.target.value)} maxLength={1000} rows={2} placeholder="What happened?" className="rounded bg-gray-800 px-2 py-1 text-sm text-white" />
          </div>
          {notes.length > 0 && <div className="mt-3 flex max-h-40 flex-col gap-2 overflow-y-auto">
            {notes.map(note => <div key={note._id} className="rounded bg-gray-800 p-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className={note.rating === "good" ? "text-green-300" : "text-red-300"}>{note.rating === "good" ? "▲ Good" : "▼ Poor"}</span>
                <button onClick={() => remove(note._id)} className="text-red-300 hover:text-red-100">Remove</button>
              </div>
              <p className="text-gray-300">{note.game ? `${note.game.date} · ${note.game.deckName} · ${note.game.result}` : "Game unavailable"}</p>
              {note.notes && <p className="mt-1 whitespace-pre-wrap text-gray-100">{note.notes}</p>}
            </div>)}
          </div>}
        </>
      )}
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
