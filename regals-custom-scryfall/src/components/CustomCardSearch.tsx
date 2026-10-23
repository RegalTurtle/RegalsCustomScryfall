"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { CustomCard } from "@/types/customCard";

type Props = { initialQuery?: string };

export default function CustomCardSearch({ initialQuery = "" }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [cards, setCards] = useState<CustomCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialQuery) return;
    setQuery(initialQuery);
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
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      router.push("/custom");
      setCards([]);
      return;
    }

    router.push(`/custom/search?q=${encodeURIComponent(trimmedQuery)}`);
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <form onSubmit={submit} className="mx-auto mb-10 flex w-full max-w-3xl gap-2">
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder='Search cards, or use filters like t:creature s:mtd cmc<3'
          className="min-w-0 flex-1 rounded-md border border-teal-300 bg-teal-950 px-4 py-3 text-white shadow-sm outline-none placeholder:text-teal-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
          aria-label="Search custom cards"
        />
        <button type="submit" className="rounded-md bg-indigo-600 px-5 py-3 font-medium text-white shadow-sm hover:bg-indigo-700">
          Search
        </button>
      </form>

      {loading && <p className="text-center text-teal-100">Searching...</p>}
      {error && <p className="text-center text-red-600">{error}</p>}
      {!loading && !error && query && cards.length === 0 && <p className="text-center text-teal-100">No cards found.</p>}

      <div className="grid grid-cols-2 justify-center gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map(card => (
          <Link
            key={`${card.set}-${card.cn}`}
            href={`/custom/card/${encodeURIComponent(card.set)}/${card.cn}?from=${encodeURIComponent(`/custom/search?q=${query}`)}`}
            className="group overflow-hidden rounded-xl border border-teal-950/70 bg-teal-950/60 text-left shadow-lg transition hover:-translate-y-1 hover:border-indigo-400 hover:shadow-xl"
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
