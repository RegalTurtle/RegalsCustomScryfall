"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RegalsMagicHeader from "@/components/RegalsMagicHeader";
import WorkshopMap from "@/components/WorkshopMap";
import CommanderStack from "@/components/CommanderStack";
import { Deck } from "@/types";

type WorkshopFilter = "all" | "recent" | "nearly" | "on-hold";

function deckId(deck: Deck) {
  return deck._id?.toString() ?? "";
}

function commanders(deck: Deck) {
  const tagged = (deck.cards || []).filter(card => card.tag?.some(tag => tag.trim().toLowerCase() === "commander"));
  return tagged.length ? tagged : deck.commander ? [deck.commander] : [];
}

function newestCommanderSet(deck: Deck, dates: Record<string, string>) {
  const selected = commanders(deck).filter(card => card.set?.trim());
  const newest = selected.reduce<(typeof selected)[number] | undefined>((current, card) => {
    if (!current) return card;
    const currentRelease = dates[current.set.trim().toUpperCase()];
    const release = dates[card.set.trim().toUpperCase()];
    if (release && currentRelease) return release > currentRelease ? card : current;
    // Custom sets may have no published release date. Use edit dates when both
    // exist; otherwise keep the first commander rather than guessing set order.
    const currentUpdate = current.updatedAt ? new Date(current.updatedAt).getTime() : NaN;
    const update = card.updatedAt ? new Date(card.updatedAt).getTime() : NaN;
    return Number.isFinite(update) && Number.isFinite(currentUpdate) && update > currentUpdate ? card : current;
  }, undefined);
  return newest?.set.trim().toUpperCase() || "NO COMMANDER SET";
}

function cardCount(deck: Deck) {
  return (deck.cards || []).reduce((total, card) => total + (card.quant || 1), 0);
}

function progressLabel(count: number) {
  const difference = Math.abs(100 - count);
  return count < 100 ? `${difference} slots remaining` : count > 100 ? `${difference} cuts remaining` : "Ready for testing";
}

function statValues(deck: Deck) {
  const cards = deck.cards || [];
  const lands = cards.filter(card => card.type.toLowerCase().includes("land")).reduce((total, card) => total + (card.quant || 1), 0);
  const creatures = cards.filter(card => card.type.toLowerCase().includes("creature")).reduce((total, card) => total + (card.quant || 1), 0);
  const draw = cards.filter(card => /draw|cards? into your hand|look at the top/i.test(card.oracle)).length;
  const ramp = cards.filter(card => /add .* mana|search your library for a basic land|treasure token/i.test(card.oracle)).length;
  const averageCmc = cards.length === 0 ? 0 : cards.reduce((total, card) => total + (card.cmc || 0), 0) / cards.length;
  return { lands, creatures, draw, ramp, averageCmc };
}

function formatDate(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function WorkshopCard({ deck }: { deck: Deck }) {
  const count = cardCount(deck);
  const stats = statValues(deck);
  const completion = Math.min(100, Math.round((count / 100) * 100));
  const selectedCommanders = commanders(deck);
  const commanderName = selectedCommanders.map(card => card.name).join(" & ") || "Commander not selected";
  const previewImages = selectedCommanders.filter(card => card.image);
  const fallbackImage = deck.cards?.find(card => card.image);
  const images = previewImages.length ? previewImages : fallbackImage ? [fallbackImage] : [];

  return (
    <Link href={`/decks/${deckId(deck)}`} className="group flex flex-col overflow-hidden rounded-2xl border border-teal-700/70 bg-teal-950 shadow-xl transition hover:-translate-y-1 hover:border-indigo-400 hover:shadow-indigo-950/50 sm:flex-row">
      <div className="flex shrink-0 overflow-hidden border-b border-teal-800 bg-teal-900 sm:w-64 sm:border-b-0 sm:border-r lg:w-72">
        {images.length ? (
          <div className="flex w-full flex-col justify-center">
            <CommanderStack images={images} />
          </div>
        ) : <div className="flex aspect-[5/7] w-full items-center justify-center p-4 text-center text-sm text-teal-300">Commander not selected</div>}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-5 p-5 text-left text-teal-50 sm:p-6">
        <div>
          <span className="inline-block rounded-full border border-teal-700 bg-teal-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">{deck.format || "EDH"} brew</span>
          <h2 className="mt-3 break-words text-2xl font-bold text-white">{deck.name}</h2>
          <p className="mt-2 text-sm text-teal-200">{commanderName}</p>
        </div>
        <div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <span className="text-2xl font-bold">{count} / 100</span>
            <span className="text-sm text-teal-200">{progressLabel(count)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-teal-800">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-cyan-300" style={{ width: `${completion}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 border-y border-teal-800 py-3 text-center">
          <div><p className="text-lg font-semibold">{stats.lands}</p><p className="text-[10px] uppercase tracking-wide text-teal-300">Lands</p></div>
          <div><p className="text-lg font-semibold">{stats.ramp}</p><p className="text-[10px] uppercase tracking-wide text-teal-300">Ramp</p></div>
          <div><p className="text-lg font-semibold">{stats.draw}</p><p className="text-[10px] uppercase tracking-wide text-teal-300">Draw</p></div>
          <div><p className="text-lg font-semibold">{stats.averageCmc.toFixed(1)}</p><p className="text-[10px] uppercase tracking-wide text-teal-300">Avg MV</p></div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-teal-300">
          <span>{deck.maybeboard?.length || 0} maybeboard · {deck.wishlist?.length || 0} wishlist</span>
          <span>Edited {formatDate(deck.lastUpdate)}</span>
        </div>
      </div>
    </Link>
  );
}

export default function DeckWorkshop() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [filter, setFilter] = useState<WorkshopFilter>("all");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"map" | "list">("map");
  const [setDates, setSetDates] = useState<Record<string, string>>({});

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/scryfall/sets", { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (data?.dates) setSetDates(data.dates); })
      .catch(() => { /* Set-date lookup must not prevent brewing. */ });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    fetch("/api/decks/all_decks?workshop=true")
      .then(response => {
        if (!response.ok) throw new Error("Failed to load workshop decks");
        return response.json();
      })
      .then(data => setDecks((data.allDecks || []).filter((deck: Deck) => deck.workshop === true)))
      .catch(error => console.error("Failed to load workshop decks", error))
      .finally(() => setLoading(false));
  }, []);

  const visibleDecks = useMemo(() => {
    const sorted = [...decks].sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime());
    if (filter === "nearly") return sorted.filter(deck => cardCount(deck) >= 80 && cardCount(deck) <= 110);
    if (filter === "on-hold") return sorted.filter(deck => (deck.notes || "").toLowerCase().includes("hold"));
    if (filter === "recent") return sorted.slice(0, 6);
    return sorted;
  }, [decks, filter]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-950 via-teal-900 to-slate-950 text-white">
      <RegalsMagicHeader showBack backUrl="/decks" backText="Decks" />
      <main className="mx-auto max-w-[1600px] px-4 pb-12 sm:px-6">

        <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {(["all", "recent", "nearly", "on-hold"] as WorkshopFilter[]).map(option => (
              <button key={option} onClick={() => setFilter(option)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === option ? "bg-indigo-500 text-white" : "bg-teal-950/80 text-teal-200 hover:bg-teal-800"}`}>
                {option === "all" ? "All brews" : option === "recent" ? "Recently edited" : option === "nearly" ? "Nearly there" : "On hold"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 rounded-lg bg-teal-950 p-1" aria-label="Workshop view">
              {(["map", "list"] as const).map(option => <button key={option} type="button" aria-pressed={view === option} onClick={() => setView(option)} className={`rounded-md px-3 py-1.5 text-sm capitalize ${view === option ? "bg-teal-700 text-white" : "text-teal-300 hover:bg-teal-800"}`}>{option}</button>)}
            </div>
            <Link href="/decks/workshop/new" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 hover:bg-indigo-400">+ New brew</Link>
          </div>
        </div>

        {loading ? <p className="py-16 text-center text-teal-200">Setting up the workbench...</p> : visibleDecks.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-teal-700 p-12 text-center text-teal-200">No brews match this view yet.</div>
        ) : view === "map" ? (
          <WorkshopMap items={visibleDecks.map(deck => ({
            id: deckId(deck),
            set: newestCommanderSet(deck, setDates),
            name: deck.name,
            images: commanders(deck).filter(card => card.image),
            details: <WorkshopCard deck={deck} />,
          }))} />
        ) : (
          <div className="mt-8 grid items-start gap-6 2xl:grid-cols-2">{visibleDecks.map(deck => <WorkshopCard key={deckId(deck)} deck={deck} />)}</div>
        )}
      </main>
    </div>
  );
}
