"use client";
import authorization from "@/authorization";
import RegalsMagicHeader from "@/components/RegalsMagicHeader";
import { Deck } from "@/types";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const manaColors: Record<string, string> = {
  W: "#f8f0d8",
  U: "#4aa3df",
  B: "#312a2c",
  R: "#d9482f",
  G: "#3d8b4f",
};

const colorOrder = ["W", "U", "B", "R", "G"];
const monoColorGroups = [
  { colorId: "W", label: "White" },
  { colorId: "U", label: "Blue" },
  { colorId: "B", label: "Black" },
  { colorId: "R", label: "Red" },
  { colorId: "G", label: "Green" },
];
const twoColorGroups = [
  { colorId: "WU", label: "Azorius" },
  { colorId: "UB", label: "Dimir" },
  { colorId: "BR", label: "Rakdos" },
  { colorId: "RG", label: "Gruul" },
  { colorId: "WG", label: "Selesnya" },
  { colorId: "WB", label: "Orzhov" },
  { colorId: "UR", label: "Izzet" },
  { colorId: "BG", label: "Golgari" },
  { colorId: "WR", label: "Boros" },
  { colorId: "UG", label: "Simic" },
];
const threeColorGroups = [
  { colorId: "WUG", label: "Bant" },
  { colorId: "WUB", label: "Esper" },
  { colorId: "UBR", label: "Grixis" },
  { colorId: "BRG", label: "Jund" },
  { colorId: "WRG", label: "Naya" },
  { colorId: "WBG", label: "Abzan" },
  { colorId: "WUR", label: "Jeskai" },
  { colorId: "UBG", label: "Sultai" },
  { colorId: "URG", label: "Temur" },
  { colorId: "WBR", label: "Mardu" },
];
const fourColorGroups = [
  { colorId: "WUBR", label: "Yore-Tiller" },
  { colorId: "UBRG", label: "Glint-Eye" },
  { colorId: "WBRG", label: "Dune-Brood" },
  { colorId: "WURG", label: "Ink-Treader" },
  { colorId: "WUBG", label: "Witch-Maw" },
];

function normalizeColorId(colorId?: string) {
  const selectedColors = new Set((colorId ?? "").toUpperCase().split(""));
  return colorOrder.filter(color => selectedColors.has(color)).join("");
}

function deckBorderStyle(colorId?: string): React.CSSProperties {
  const colors = normalizeColorId(colorId).split("")
    .map(color => manaColors[color])
    .filter(Boolean);

  if (colors.length === 0) return {};

  return {
    background: colors.length === 1
      ? colors[0]
      : `linear-gradient(135deg, ${colors.join(", ")})`,
  };
}

function DeckCard({ deck }: { deck: Deck }) {
  return (
    <Link
      href={`/decks/${deck._id?.toString()}`}
      className="rounded-lg shadow-md p-2 w-full text-black"
      style={deckBorderStyle(deck.colorId)}
    >
      <div className="bg-teal-100 rounded-md p-4 h-full flex flex-col gap-1">
        <p className="font-semibold">{deck.name}</p>
        <p className="text-sm">{deck.format}</p>
        <p className="text-sm">Owner: {deck.owner}</p>
      </div>
    </Link>
  );
}

function DeckGroup({ title, decks }: { title: string, decks: Deck[] }) {
  return (
    <section>
      <h2 className="mb-2 text-left text-sm font-semibold uppercase tracking-wide text-teal-100">
        {title}
      </h2>
      <div className="flex flex-col gap-3">
        {decks.length === 0 ? (
          <div className="rounded border border-teal-700/60 px-3 py-4 text-sm text-teal-100/70">
            No decks
          </div>
        ) : (
          decks.map(deck => <DeckCard key={deck._id?.toString()} deck={deck} />)
        )}
      </div>
    </section>
  );
}

export default function Decks() {
  const { data: session, status: sessionStatus } = useSession();

  // Deck information
  const [ decks, setDecks ] = useState<Deck[]>([]);
  const [ loadingDecks, setLoadingDecks ] = useState<boolean>(true);
  const [ formatFilter, setFormatFilter ] = useState("EDH");
  const [ sortBy, setSortBy ] = useState("name-asc");

  useEffect(() => {
    async function fetchDecks() {
      try {
        let res = await fetch("/api/decks/all_decks");
        const { allDecks } = await res.json();
        setDecks(allDecks);
      } catch(error) {
        console.error("Failed to fetch decks", error);
      } finally {
        setLoadingDecks(false);
      }
    }

    fetchDecks();
  }, []);

  const formats = useMemo(() => {
    return Array.from(new Set(decks.map(deck => deck.format).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [decks]);

  const visibleDecks = useMemo(() => {
    const filteredDecks = formatFilter === "all"
      ? decks
      : decks.filter(deck => deck.format === formatFilter);

    return [...filteredDecks].sort((a, b) => {
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      if (sortBy === "format-asc") return a.format.localeCompare(b.format) || a.name.localeCompare(b.name);
      if (sortBy === "owner-asc") return a.owner.localeCompare(b.owner) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  }, [decks, formatFilter, sortBy]);

  const edhColorGroups = useMemo(() => {
    const edhDecks = visibleDecks.filter(deck => normalizeColorId(deck.colorId).length !== 3 && normalizeColorId(deck.colorId).length !== 4);

    return {
      colorless: visibleDecks.filter(deck => normalizeColorId(deck.colorId).length === 0),
      mono: Object.fromEntries(
        monoColorGroups.map(group => [
          group.colorId,
          visibleDecks.filter(deck => normalizeColorId(deck.colorId) === group.colorId),
        ])
      ) as Record<string, Deck[]>,
      twoColor: Object.fromEntries(
        twoColorGroups.map(group => [
          group.colorId,
          visibleDecks.filter(deck => normalizeColorId(deck.colorId) === group.colorId),
        ])
      ) as Record<string, Deck[]>,
      threeColor: visibleDecks.filter(deck => normalizeColorId(deck.colorId).length === 3),
      fourColor: visibleDecks.filter(deck => normalizeColorId(deck.colorId).length === 4),
      namedThreeColor: Object.fromEntries(
        threeColorGroups.map(group => [
          group.colorId,
          visibleDecks.filter(deck => normalizeColorId(deck.colorId) === group.colorId),
        ])
      ) as Record<string, Deck[]>,
      namedFourColor: Object.fromEntries(
        fourColorGroups.map(group => [
          group.colorId,
          visibleDecks.filter(deck => normalizeColorId(deck.colorId) === group.colorId),
        ])
      ) as Record<string, Deck[]>,
      fiveColor: visibleDecks.filter(deck => normalizeColorId(deck.colorId).length === 5),
    };
  }, [visibleDecks]);

  const showEdhColorView = formatFilter.toLowerCase() === "edh";

  if (sessionStatus === "loading" || loadingDecks) {
    return (
      <p>Loading...</p>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-teal-900">
      <RegalsMagicHeader
        showBack={true}
        backUrl="/"
        backText="Home"
      />

      <main className="flex-1 px-4 text-center justify-items-center">
        {session && authorization.canAddDecks(session.user?.permissionLevel) && 
          <Link href="/decks/new" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">New Deck</Link>
        }

        <div className="mt-5 flex w-full max-w-5xl flex-col gap-3 rounded bg-teal-950/40 p-4 text-left sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span>Filter by format</span>
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="rounded border border-teal-700 bg-teal-100 px-3 py-2 text-black"
            >
              <option value="all">All formats</option>
              {formats.map(format => (
                <option key={format} value={format}>{format}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span>Sort decks</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded border border-teal-700 bg-teal-100 px-3 py-2 text-black"
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="format-asc">Format</option>
              <option value="owner-asc">Owner</option>
            </select>
          </label>
        </div>

        {showEdhColorView ? (
          <div className="mt-5 w-full max-w-6xl mx-auto text-white">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.5fr_1.5fr_1.5fr]">
              <div className="space-y-5">
                {monoColorGroups.map(group => (
                  <DeckGroup
                    key={group.colorId}
                    title={group.label}
                    decks={edhColorGroups.mono[group.colorId]}
                  />
                ))}
              </div>

              <div className="space-y-5">
                {twoColorGroups.map(group => (
                  <DeckGroup
                    key={group.colorId}
                    title={group.label}
                    decks={edhColorGroups.twoColor[group.colorId]}
                  />
                ))}
              </div>

              <div className="space-y-5">
                {threeColorGroups.map(group => (
                  <DeckGroup
                    key={group.colorId}
                    title={group.label}
                    decks={edhColorGroups.namedThreeColor[group.colorId]}
                  />
                ))}
              </div>

              <div className="space-y-5">
                {fourColorGroups.map(group => (
                  <DeckGroup
                    key={group.colorId}
                    title={group.label}
                    decks={edhColorGroups.namedFourColor[group.colorId]}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <DeckGroup title="Colorless" decks={edhColorGroups.colorless} />
              <DeckGroup title="5 color" decks={edhColorGroups.fiveColor} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 justify-items-stretch mt-5 w-full max-w-5xl mx-auto">
            {visibleDecks.map(deck => <DeckCard key={deck._id?.toString()} deck={deck} />)}
          </div>
        )}
      </main>
    </div>
  )
}
