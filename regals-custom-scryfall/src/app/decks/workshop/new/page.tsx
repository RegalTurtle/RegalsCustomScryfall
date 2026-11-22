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

export default function NewBrew() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [format, setFormat] = useState("EDH");
  const [colorId, setColorId] = useState("");

  if (sessionStatus === "loading") return <p>Loading...</p>;
  if (!session || !authorization.canAddDecks(session.user?.permissionLevel)) redirect("/login");

  const toggleColor = (color: string) => {
    setColorId(current => {
      const selected = new Set(current.split(""));
      if (selected.has(color)) selected.delete(color);
      else selected.add(color);
      return normalizeColorId([...selected].join(""));
    });
  };

  const createBrew = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/decks/add_deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, owner, format, colorId, together: false, workshop: true }),
      });
      if (!response.ok) throw new Error("Failed to create brew");
      const { objId } = await response.json();
      router.push(`/decks/${objId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to create brew");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-950 via-teal-900 to-slate-950 text-white">
      <RegalsMagicHeader showBack backUrl="/decks/workshop" backText="Workshop" />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 pb-12 pt-6 lg:grid-cols-[1fr_0.8fr] lg:items-start sm:px-6">
        <form onSubmit={createBrew} className="rounded-3xl border border-teal-700/70 bg-teal-950/80 p-6 shadow-2xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Start at the workbench</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">New brew</h1>
          <p className="mt-3 max-w-xl text-teal-200/80">Give the idea a name and a home. You can choose the commander, add cards, and shape the deck later.</p>

          {error && <p className="mt-5 rounded-xl border border-red-400/40 bg-red-950/50 px-4 py-3 text-sm text-red-100">{error}</p>}

          <div className="mt-7 space-y-5">
            <label className="block"><span className="mb-2 block text-sm font-medium text-teal-100">What are you brewing?</span><input value={name} onChange={event => setName(event.target.value)} className="w-full rounded-xl border border-teal-700 bg-teal-900 px-4 py-3 text-white outline-none placeholder:text-teal-400 focus:border-cyan-300" placeholder="e.g. Graveyard birds" required /></label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block"><span className="mb-2 block text-sm font-medium text-teal-100">Your name / source</span><input value={owner} onChange={event => setOwner(event.target.value)} className="w-full rounded-xl border border-teal-700 bg-teal-900 px-4 py-3 text-white outline-none focus:border-cyan-300" placeholder="e.g. Regal" required /></label>
              <label className="block"><span className="mb-2 block text-sm font-medium text-teal-100">Format</span><input value={format} onChange={event => setFormat(event.target.value)} className="w-full rounded-xl border border-teal-700 bg-teal-900 px-4 py-3 text-white outline-none focus:border-cyan-300" required /></label>
            </div>
            <div><span className="mb-2 block text-sm font-medium text-teal-100">Color identity <span className="font-normal text-teal-400">(you can change this later)</span></span><div className="flex flex-wrap gap-2">{colorOptions.map(color => { const selected = colorId.includes(color.id); return <button key={color.id} type="button" onClick={() => toggleColor(color.id)} className={`h-11 w-11 rounded-full border-2 font-semibold transition ${color.className} ${selected ? "border-cyan-200 ring-2 ring-cyan-300/50" : "border-transparent opacity-70 hover:opacity-100"}`}>{color.label}</button>; })}<button type="button" onClick={() => setColorId("")} className="rounded-full border border-teal-600 px-4 text-sm text-teal-200 hover:bg-teal-800">Colorless</button></div></div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => router.push("/decks/workshop")} className="rounded-xl border border-teal-700 px-5 py-3 text-sm text-teal-200 hover:bg-teal-900">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Setting the table..." : "Start brewing"}</button></div>
        </form>

        <aside className="rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-950/80 to-teal-950/80 p-6 shadow-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-300">Your starting point</p>
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5"><p className="text-3xl font-bold">0 / 100</p><p className="mt-1 text-sm text-teal-300">100 slots remaining</p><div className="mt-5 h-2 rounded-full bg-teal-800"><div className="h-full w-0 rounded-full bg-cyan-300" /></div></div>
          <div className="mt-6 space-y-4 text-sm text-teal-200/80"><p><span className="mr-2 text-cyan-300">✦</span>Start with an idea, not a finished list.</p><p><span className="mr-2 text-cyan-300">✦</span>Add a commander whenever the direction becomes clear.</p><p><span className="mr-2 text-cyan-300">✦</span>Keep it in the Workshop until it is ready for the main deck shelf.</p></div>
        </aside>
      </main>
    </div>
  );
}
