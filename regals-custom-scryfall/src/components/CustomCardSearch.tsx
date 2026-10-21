"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { CustomCard } from "@/types/customCard";

type Props = { initialQuery?: string };

export default function CustomCardSearch({ initialQuery = "" }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [cards, setCards] = useState<CustomCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialQuery) return;
    void search(initialQuery);
  }, [initialQuery]);

  async function search(searchQuery: string) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/custom/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Search failed");
      setCards(data.cards ?? []);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Search failed");
      setCards([]);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search(query);
  }

  return (
    <div className="w-full max-w-6xl">
      <form onSubmit={submit} className="mx-auto mb-8 flex w-full max-w-3xl gap-2">
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder='Search cards, or use filters like t:creature s:mtd cmc<3'
          className="min-w-0 flex-1 rounded-lg border border-teal-300 bg-teal-950 px-4 py-3 text-white outline-none focus:border-indigo-400"
          aria-label="Search custom cards"
        />
        <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-3 text-white hover:bg-indigo-700">
          Search
        </button>
      </form>

      {loading && <p className="text-center text-teal-100">Searching...</p>}
      {error && <p className="text-center text-red-300">{error}</p>}
      {!loading && !error && query && cards.length === 0 && <p className="text-center text-teal-100">No cards found.</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {cards.map(card => (
          <Link
            key={`${card.set}-${card.cn}`}
            href={`/custom/card/${encodeURIComponent(card.set)}/${card.cn}`}
            className="group overflow-hidden rounded-xl bg-teal-950/60 shadow-lg transition hover:-translate-y-1 hover:ring-2 hover:ring-indigo-400"
          >
            <img src={card.img} alt={`${card.name} (${card.set}${card.cn})`} className="aspect-[5/7] w-full object-cover" loading="lazy" />
            <div className="p-2 text-left">
              <p className="truncate font-semibold text-white">{card.name}</p>
              <p className="text-sm text-teal-200">{card.set}{card.cn}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
