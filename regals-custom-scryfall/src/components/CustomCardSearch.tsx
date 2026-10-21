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
    <div className="mx-auto w-full max-w-6xl">
      <form onSubmit={submit} className="mx-auto mb-10 flex w-full max-w-3xl gap-2">
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder='Search cards, or use filters like t:creature s:mtd cmc<3'
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          aria-label="Search custom cards"
        />
        <button type="submit" className="rounded-md bg-sky-600 px-5 py-3 font-medium text-white shadow-sm hover:bg-sky-700">
          Search
        </button>
      </form>

      {loading && <p className="text-center text-slate-500">Searching...</p>}
      {error && <p className="text-center text-red-600">{error}</p>}
      {!loading && !error && query && cards.length === 0 && <p className="text-center text-slate-500">No cards found.</p>}

      <div className="grid grid-cols-2 justify-center gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {cards.map(card => (
          <Link
            key={`${card.set}-${card.cn}`}
            href={`/custom/card/${encodeURIComponent(card.set)}/${card.cn}`}
            className="group overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-sky-400 hover:shadow-lg"
          >
            <img src={card.img} alt={`${card.name} (${card.set}${card.cn})`} className="aspect-[5/7] w-full object-cover" loading="lazy" />
            <div className="p-2 text-left">
              <p className="truncate font-semibold text-slate-800">{card.name}</p>
              <p className="text-sm text-slate-500">{card.set}{card.cn}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
