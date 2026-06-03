"use client";

import authorization from "@/authorization";
import RegalsMagicHeader from "@/components/RegalsMagicHeader";
import { Deck, GameResult, GameStats, SerializedGame } from "@/types";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type DeckOption = {
  _id: string;
  name: string;
  format: string;
  link?: string;
};

const resultLabels: Record<GameResult, string> = {
  win: "Win",
  loss: "Loss",
  tie: "Tie",
};

const emptyStats: GameStats = {
  total: 0,
  wins: 0,
  losses: 0,
  ties: 0,
  winRate: 0,
  averageTurn: null,
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function serializeDeck(deck: Deck): DeckOption {
  return {
    _id: deck._id?.toString() ?? "",
    name: deck.name,
    format: deck.format,
    link: deck.link,
  };
}

export default function GamesPage() {
  const { data: session, status } = useSession();
  const canAddGames = Boolean(session && authorization.canAddGames(session.user?.permissionLevel));
  const [games, setGames] = useState<SerializedGame[]>([]);
  const [stats, setStats] = useState<GameStats>(emptyStats);
  const [decks, setDecks] = useState<DeckOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAddGame, setShowAddGame] = useState(false);
  const [update, setUpdate] = useState(0);
  const [deckFilter, setDeckFilter] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [date, setDate] = useState(todayString());
  const [deckId, setDeckId] = useState("");
  const [deckName, setDeckName] = useState("");
  const [deckLink, setDeckLink] = useState("");
  const [format, setFormat] = useState("");
  const [result, setResult] = useState<GameResult>("win");
  const [numPlayers, setNumPlayers] = useState(4);
  const [turnNumber, setTurnNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [initializedFromQuery, setInitializedFromQuery] = useState(false);

  const formats = useMemo(() => (
    Array.from(new Set([
      ...decks.map(deck => deck.format),
      ...games.map(game => game.format),
    ].filter(Boolean))).sort((a, b) => a.localeCompare(b))
  ), [decks, games]);

  useEffect(() => {
    async function fetchDecks() {
      try {
        const res = await fetch("/api/decks/all_decks");
        if (!res.ok) throw new Error("Could not fetch decks");
        const { allDecks } = await res.json();
        setDecks((allDecks as Deck[]).map(serializeDeck));
      } catch (error) {
        setError(error instanceof Error ? error.message : "Could not fetch decks");
      }
    }

    fetchDecks();
  }, []);

  useEffect(() => {
    if (initializedFromQuery || decks.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const queryDeckId = params.get("deckId") ?? "";

    if (queryDeckId) {
      chooseDeck(queryDeckId);
      setDeckFilter(queryDeckId);
    }

    if (params.get("add") === "1") {
      setShowAddGame(true);
    }

    setInitializedFromQuery(true);
  }, [decks, initializedFromQuery]);

  useEffect(() => {
    async function fetchGames() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (deckFilter) params.set("deckId", deckFilter);
        if (formatFilter) params.set("format", formatFilter);
        if (resultFilter) params.set("result", resultFilter);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        const res = await fetch(`/api/games${params.toString() ? `?${params.toString()}` : ""}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not fetch games");

        setGames(data.games ?? []);
        setStats(data.stats ?? emptyStats);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Could not fetch games");
      } finally {
        setLoading(false);
      }
    }

    fetchGames();
  }, [deckFilter, formatFilter, resultFilter, dateFrom, dateTo, update]);

  const chooseDeck = (selectedDeckId: string) => {
    setDeckId(selectedDeckId);
    const selectedDeck = decks.find(deck => deck._id === selectedDeckId);
    if (!selectedDeck) return;

    setDeckName(selectedDeck.name);
    setDeckLink(selectedDeck.link ?? "");
    setFormat(selectedDeck.format);
  };

  const resetForm = () => {
    setDate(todayString());
    setDeckId("");
    setDeckName("");
    setDeckLink("");
    setFormat("");
    setResult("win");
    setNumPlayers(4);
    setTurnNumber("");
    setNotes("");
  };

  const addGame = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

      if (!res.ok) throw new Error(data.error ?? "Could not add game");

      resetForm();
      setShowAddGame(false);
      setUpdate(current => current + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not add game");
    } finally {
      setSaving(false);
    }
  };

  const deleteGame = async (gameId: string) => {
    setError("");

    try {
      const res = await fetch(`/api/games/${gameId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not delete game");
      setUpdate(current => current + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not delete game");
    }
  };

  if (status === "loading") return <p>Loading...</p>;

  return (
    <div className="flex min-h-screen flex-col bg-teal-900 text-white">
      <RegalsMagicHeader
        showBack={true}
        backUrl="/"
        backText="Home"
      />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Games</h1>
            <p className="text-sm text-teal-100/80">Track date, format, result, players, turn, deck, and notes.</p>
          </div>
          {canAddGames && (
            <button
              onClick={() => setShowAddGame(true)}
              className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              + Add Game
            </button>
          )}
        </div>

        {error && (
          <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded bg-teal-950/40 p-3">
            <p className="text-xs uppercase text-teal-100/70">Games</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </div>
          <div className="rounded bg-teal-950/40 p-3">
            <p className="text-xs uppercase text-teal-100/70">Wins</p>
            <p className="text-2xl font-semibold">{stats.wins}</p>
          </div>
          <div className="rounded bg-teal-950/40 p-3">
            <p className="text-xs uppercase text-teal-100/70">Losses</p>
            <p className="text-2xl font-semibold">{stats.losses}</p>
          </div>
          <div className="rounded bg-teal-950/40 p-3">
            <p className="text-xs uppercase text-teal-100/70">Ties</p>
            <p className="text-2xl font-semibold">{stats.ties}</p>
          </div>
          <div className="rounded bg-teal-950/40 p-3">
            <p className="text-xs uppercase text-teal-100/70">Win Rate</p>
            <p className="text-2xl font-semibold">{`${Math.round(stats.winRate * 100)}%`}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 rounded bg-teal-950/40 p-4 md:grid-cols-5">
          <select
            value={deckFilter}
            onChange={(e) => setDeckFilter(e.target.value)}
            className="rounded border border-teal-700 bg-teal-100 px-3 py-2 text-black"
          >
            <option value="">All decks</option>
            {decks.map(deck => (
              <option key={deck._id} value={deck._id}>{deck.name}</option>
            ))}
          </select>
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className="rounded border border-teal-700 bg-teal-100 px-3 py-2 text-black"
          >
            <option value="">All formats</option>
            {formats.map(formatOption => (
              <option key={formatOption} value={formatOption}>{formatOption}</option>
            ))}
          </select>
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="rounded border border-teal-700 bg-teal-100 px-3 py-2 text-black"
          >
            <option value="">All results</option>
            <option value="win">Wins</option>
            <option value="loss">Losses</option>
            <option value="tie">Ties</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded border border-teal-700 bg-teal-100 px-3 py-2 text-black"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded border border-teal-700 bg-teal-100 px-3 py-2 text-black"
          />
        </section>

        <section className="overflow-x-auto rounded bg-teal-950/40">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-teal-700/60 text-teal-100">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Format</th>
                <th className="px-3 py-2">Result</th>
                <th className="px-3 py-2">Players</th>
                <th className="px-3 py-2">Turn</th>
                <th className="px-3 py-2">Deck</th>
                <th className="px-3 py-2">Notes</th>
                {canAddGames && <th className="px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={canAddGames ? 8 : 7} className="px-3 py-6 text-center text-teal-100/80">Loading games...</td></tr>
              ) : games.length === 0 ? (
                <tr><td colSpan={canAddGames ? 8 : 7} className="px-3 py-6 text-center text-teal-100/80">No games logged yet.</td></tr>
              ) : (
                games.map(game => (
                  <tr key={game._id} className="border-b border-teal-800/70 last:border-0">
                    <td className="px-3 py-2">{game.date}</td>
                    <td className="px-3 py-2">{game.format}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${game.result === "win" ? "bg-emerald-600" : game.result === "loss" ? "bg-red-700" : "bg-sky-700"}`}>
                        {resultLabels[game.result]}
                      </span>
                    </td>
                    <td className="px-3 py-2">{game.numPlayers}</td>
                    <td className="px-3 py-2">{game.turnNumber ?? ""}</td>
                    <td className="px-3 py-2">
                      {game.deckId ? (
                        <Link href={`/decks/${game.deckId}`} className="font-medium text-teal-100 underline-offset-2 hover:underline">
                          {game.deckName}
                        </Link>
                      ) : (
                        game.deckName
                      )}
                    </td>
                    <td className="max-w-md px-3 py-2">
                      <p className="whitespace-pre-wrap">{game.notes}</p>
                    </td>
                    {canAddGames && (
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => deleteGame(game._id)}
                          className="rounded bg-red-700 px-3 py-1 text-xs text-white hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>

      {showAddGame && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setShowAddGame(false)}
        >
          <form
            onSubmit={addGame}
            className="collection-card-modal max-h-[90vh] w-[90%] max-w-xl overflow-y-auto rounded bg-white p-5 text-black shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Add Game</h2>
              <button type="button" onClick={() => setShowAddGame(false)} className="text-xl">x</button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Date</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded border p-2" required />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Deck</span>
                <select value={deckId} onChange={(e) => chooseDeck(e.target.value)} className="w-full rounded border p-2">
                  <option value="">Manual deck</option>
                  {decks.map(deck => (
                    <option key={deck._id} value={deck._id}>{deck.name}</option>
                  ))}
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

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddGame(false)} className="rounded border border-gray-300 px-4 py-2 hover:bg-gray-100">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:bg-gray-400">
                {saving ? "Saving..." : "Save Game"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
