"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import RegalsMagicHeader from "@/components/RegalsMagicHeader";
import { CustomCard } from "@/types/customCard";

export default function CustomCardDetailPage() {
  const { set, cn } = useParams<{ set: string; cn: string }>();
  const { data: session } = useSession();
  const [card, setCard] = useState<CustomCard | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!set || !cn) return;
    fetch(`/api/custom/card/${encodeURIComponent(set)}/${cn}`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Card not found");
        setCard(data.card);
      })
      .catch(fetchError => setError(fetchError instanceof Error ? fetchError.message : "Card not found"));
  }, [set, cn]);

  async function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const response = await fetch(`/api/custom/card/${encodeURIComponent(set)}/${cn}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not save note");
      return;
    }
    setNote("");
    setMessage("Note added. Refresh the page to see it.");
  }

  if (error && !card) return <div className="min-h-screen bg-teal-900 p-8 text-center text-red-300">{error}</div>;
  if (!card) return <div className="min-h-screen bg-teal-900 p-8 text-center text-white">Loading...</div>;

  return (
    <div className="flex min-h-screen flex-col bg-teal-900">
      <RegalsMagicHeader showBack backUrl="/custom" backText="Search" />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 lg:flex-row">
        <div className="mx-auto w-full max-w-md">
          <img src={card.img} alt={card.name} className="w-full rounded-2xl shadow-2xl" />
          {card.img_backside && <img src={card.img_backside} alt={`${card.name} backside`} className="mt-4 w-full rounded-2xl shadow-2xl" />}
        </div>
        <section className="w-full rounded-2xl bg-teal-950/70 p-6 text-left text-white">
          <h2 className="text-3xl font-bold">{card.name}</h2>
          <p className="mt-2 text-teal-200">{card.cost} · {card.type}</p>
          {card.text && <p className="mt-6 whitespace-pre-line">{card.text.replaceAll("~", card.name).replaceAll("{line}", "\n")}</p>}
          {card.power !== undefined && card.toughness !== undefined && <p className="mt-4 text-right text-xl">{card.power}/{card.toughness}</p>}
          {card.flavor && <p className="mt-6 italic text-teal-200">{card.flavor.replaceAll("{lns}", "\n").replaceAll("{-}", "—")}</p>}
          <p className="mt-6 border-t border-teal-700 pt-4 text-teal-200">{card.set}{card.cn} · {card.rarity ?? ""}</p>

          <div className="mt-8 border-t border-teal-700 pt-5">
            <h3 className="text-xl font-semibold">Notes</h3>
            <ul className="mt-3 space-y-2">
              {card.notes?.map((item, index) => <li key={`${item.date}-${index}`} className="rounded bg-teal-900 p-3"><span className="font-semibold">{item.creator}:</span> {item.notes}<span className="ml-2 text-sm text-teal-300">({item.date})</span></li>)}
            </ul>
            {session ? (
              <form onSubmit={submitNote} className="mt-5 flex flex-col gap-2">
                <textarea value={note} onChange={event => setNote(event.target.value)} required maxLength={1000} placeholder="Add a note" className="rounded-lg bg-teal-900 p-3 text-white" />
                <button type="submit" className="self-start rounded-lg bg-indigo-600 px-4 py-2 hover:bg-indigo-700">Add note</button>
                {message && <p className="text-green-300">{message}</p>}
                {error && <p className="text-red-300">{error}</p>}
              </form>
            ) : <p className="mt-5 text-teal-200">Sign in to add a note.</p>}
          </div>
        </section>
      </main>
      <footer className="flex h-16 items-center justify-center bg-gray-900"><Link href="/custom" className="text-teal-200 hover:text-white">Back to search</Link></footer>
    </div>
  );
}
