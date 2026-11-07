"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import authorization from "@/authorization";
import RegalsMagicHeader from "@/components/RegalsMagicHeader";
import type { Card, Deck } from "@/types";
import { cardFitsDeck, matchingEdhDecks } from "@/utils/cardDeckMatch";
import { deckBorderStyle } from "@/utils/deckColors";
import { fetchScryfallJson } from "@/utils/scryfallRateLimit";

type SearchCard = {
  id: string;
  name: string;
  set: string;
  collector_number: string;
  finishes: string[];
  color_identity: string[];
  colors?: string[];
  cmc: number;
  type_line: string;
  oracle_text?: string;
  image_uris?: { normal?: string };
  card_faces?: { oracle_text?: string; colors?: string[]; image_uris?: { normal?: string } }[];
};
type SearchResult = { data?: SearchCard[]; has_more?: boolean; details?: string };
const imageFor = (card: SearchCard) => card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? "";

function cardPayload(card: SearchCard) {
  const colors = card.colors ?? card.card_faces?.flatMap(face => face.colors ?? []) ?? [];
  return {
    name: card.name, quant: 1, set: card.set, cn: card.collector_number,
    foil: card.finishes.includes("nonfoil") ? "nonfoil" : card.finishes[0],
    proxy: false, image: imageFor(card),
    oracle: card.oracle_text ?? card.card_faces?.map(face => face.oracle_text ?? "").join(" // ") ?? "",
    color: "WUBRG".split("").filter(color => colors.includes(color)).join(""),
    color_identity: card.color_identity.join(""), type: card.type_line, cmc: card.cmc,
  };
}

export default function ViewCard() {
  const { data: session } = useSession();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckLoading, setDeckLoading] = useState(true);
  const [deckError, setDeckError] = useState("");
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<SearchCard[]>([]);
  const [selected, setSelected] = useState<SearchCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const [addError, setAddError] = useState("");
  const [maybeboardStatus, setMaybeboardStatus] = useState<{
    cardId: string; deckIds: string[]; error?: string;
  } | null>(null);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    const cardId = selected.id;
    async function checkMaybeboards() {
      try {
        const res = await fetch(`/api/collection/card_deck_usage?name=${encodeURIComponent(selected!.name)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Could not check Online Maybeboards. Adding will check the selected deck again.");
        const data: { usages: { deckId: string; section: string }[] } = await res.json();
        if (!cancelled) setMaybeboardStatus({ cardId, deckIds: data.usages.filter(usage => usage.section === "wishlist").map(usage => usage.deckId) });
      } catch (err) {
        if (!cancelled) setMaybeboardStatus({ cardId, deckIds: [], error: err instanceof Error ? err.message : "Could not check Online Maybeboards" });
      }
    }
    setMaybeboardStatus(null);
    void checkMaybeboards();
    return () => { cancelled = true; };
  }, [selected]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/decks/all_decks");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load decks");
        if (!cancelled) setDecks(data.allDecks);
      } catch (err) {
        if (!cancelled) setDeckError(err instanceof Error ? err.message : "Could not load decks");
      } finally {
        if (!cancelled) setDeckLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!query.trim() || loading || adding) return;
    setLoading(true);
    setError("");
    setSelected(null);
    setCards([]);
    setAddError("");
    try {
      const params = new URLSearchParams({ q: query.trim(), unique: "cards", order: "name" });
      const { res, data } = await fetchScryfallJson<SearchResult>(`https://api.scryfall.com/cards/search?${params}`);
      if (res.status === 404) { setHasMore(false); return; }
      if (!res.ok) throw new Error(data.details ?? "Search failed");
      setCards(data.data ?? []);
      setHasMore(Boolean(data.has_more));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  async function addToDeck(deck: Deck) {
    if (!selected || adding) return;
    const id = String(deck._id);
    setAdding(true);
    setAddError("");
    try {
      // Check by name across printings so repeat visits do not increase quantities.
      const deckRes = await fetch(`/api/decks/${id}`);
      const deckData = await deckRes.json();
      if (!deckRes.ok) throw new Error(deckData.error ?? "Could not check deck");
      const current: Deck = deckData.foundDeck;
      if (current.together === false) throw new Error("This deck is no longer built. Refresh to see updated matches.");
      if (!cardFitsDeck(selected.color_identity, current.colorId)) throw new Error("This deck's color identity has changed. Refresh to see updated matches.");
      if (!(current.wishlist ?? []).some(card => card.name === selected.name)) {
        const res = await fetch(`/api/collection/decks+wishlist+${id}/add_card`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cardPayload(selected)),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not add card");
      }
      setAdded(previous => ({ ...previous, [`${selected.id}:${id}`]: true }));
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not add card");
    } finally {
      setAdding(false);
    }
  }

  async function addToWatchlist() {
    if (!selected || adding) return;
    setAdding(true);
    setAddError("");
    try {
      const check = await fetch("/api/collection/watchlist/card_page");
      if (!check.ok) throw new Error("Could not check the watchlist");
      const watchlist: Card[] = await check.json();
      if (!watchlist.some(card => card.name.trim().toLowerCase() === selected.name.trim().toLowerCase())) {
        const res = await fetch("/api/collection/watchlist/add_card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cardPayload(selected)),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Could not add card to watchlist");
        }
      }
      setAdded(previous => ({ ...previous, [`${selected.name}:watchlist`]: true }));
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not add card to watchlist");
    } finally {
      setAdding(false);
    }
  }

  const matches = selected ? matchingEdhDecks(decks, selected.color_identity) : [];
  const canAdd = session && authorization.canAddCardsToCollection(session.user?.permissionLevel);
  const checkingMaybeboards = Boolean(selected && maybeboardStatus?.cardId !== selected.id);

  return (
    <div className="min-h-screen bg-teal-900 text-white">
      <RegalsMagicHeader showBack backUrl="/decks" backText="Decks" />
      <main className="mx-auto max-w-6xl px-4 pb-10">
        <h1 className="mb-2 text-2xl font-semibold">View Card</h1>
        <p className="mb-4 text-teal-100">Search Scryfall, select a card, and find built EDH decks that fit its color identity. Main decks appear first, in color order.</p>
        <form onSubmit={search} className="mb-4 flex gap-2">
          <input aria-label="Search Scryfall" value={query} onChange={event => setQuery(event.target.value)} placeholder="Card name or Scryfall query (e.g. t:creature c:green)" className="min-w-0 flex-1 rounded border border-teal-500 bg-teal-950 px-3 py-2" />
          <button disabled={loading || adding || !query.trim()} className="rounded bg-indigo-600 px-4 py-2 hover:bg-indigo-700 disabled:opacity-50">{loading ? "Searching..." : "Search"}</button>
        </form>
        {error && <p role="alert" className="mb-4 text-red-200">{error}</p>}
        {!loading && searched && !error && cards.length === 0 && <p>No cards found. Try another name or query.</p>}
        {hasMore && !loading && !error && <p className="mb-3 text-teal-100">Showing the first {cards.length} results. Refine your search to find a specific card.</p>}
        {selected && (
          <section className="mb-6 rounded bg-teal-950/60 p-4" aria-label="Matching decks">
            <div className="flex flex-col gap-5 sm:flex-row">
              {imageFor(selected) && <img src={imageFor(selected)} alt={selected.name} className="w-56 self-start rounded-lg" />}
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{selected.name}</h2>
                <p className="mb-2">Color identity: {selected.color_identity.join("") || "Colorless"}</p>
                <p className="mb-4 text-sm text-teal-200">Matches check color identity only. Format legality and banned lists are not checked.</p>
                {deckLoading ? <p>Loading decks...</p> : deckError ? <p role="alert">{deckError}</p> : <>
                  <h3 className="mb-2 font-semibold">Matching EDH decks ({matches.length})</h3>
                  {matches.length === 0 && <p>No EDH decks match this card's color identity.</p>}
                  {!canAdd && <p className="mb-2 text-sm text-teal-200">Sign in with card-editing access to add to an Online Maybeboard.</p>}
                  <ul className="space-y-2">
                    {matches.map((deck, index) => {
                      const id = String(deck._id);
                      const isAdded = added[`${selected.id}:${id}`] || (maybeboardStatus?.cardId === selected.id && maybeboardStatus.deckIds.includes(id));
                      return <li key={id}>
                        {!deck.mainForColorIdentity && index > 0 && matches[index - 1].mainForColorIdentity && (
                          <div className="mb-3 mt-6 border-t border-teal-500 pt-3 text-sm font-semibold uppercase tracking-wide text-teal-100">Other decks</div>
                        )}
                        <div className="rounded-lg p-2 shadow-md" style={deckBorderStyle(deck.colorId)}>
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-teal-100 p-4 text-black">
                        <div><Link href={`/decks/${id}`} className="font-semibold underline">{deck.name}</Link><p className="text-sm text-teal-800">{deck.format} · {deck.colorId || "Colorless"}</p></div>
                        {deck.mainForColorIdentity && <span className="text-sm font-medium">Main deck</span>}
                        {canAdd && <button disabled={adding || checkingMaybeboards || isAdded} onClick={() => void addToDeck(deck)} className="rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50">{isAdded ? "On Online Maybeboard" : checkingMaybeboards ? "Checking Online Maybeboard..." : "Add to Online Maybeboard"}</button>}
                        </div>
                        </div>
                      </li>;
                    })}
                  </ul>
                </>}
                {canAdd && <div className="mt-6 border-t border-teal-700 pt-4">
                  <button disabled={adding || added[`${selected.name}:watchlist`]} onClick={() => void addToWatchlist()} className="rounded bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-600 disabled:opacity-50">
                    {added[`${selected.name}:watchlist`] ? "On Watchlist" : "Add to Watchlist"}
                  </button>
                </div>}
                {adding && <p role="status" className="mt-2">Adding card...</p>}
                {maybeboardStatus?.cardId === selected.id && maybeboardStatus.error && <p role="alert" className="mt-2 text-red-200">{maybeboardStatus.error}</p>}
                {addError && <p role="alert" className="mt-2 text-red-200">{addError}</p>}
              </div>
            </div>
          </section>
        )}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map(card => <button key={card.id} disabled={adding} aria-pressed={selected?.id === card.id} onClick={() => { setSelected(card); setAddError(""); }} className={`rounded-lg border-2 p-2 text-left hover:border-indigo-400 disabled:opacity-50 ${selected?.id === card.id ? "border-indigo-400 bg-teal-950" : "border-transparent bg-teal-950/40"}`}>
            {imageFor(card) && <img src={imageFor(card)} alt={card.name} loading="lazy" className="mb-2 w-full rounded" />}
            <span className="font-medium">{card.name}</span>
          </button>)}
        </div>
      </main>
    </div>
  );
}
