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
const gradientColorOrders: Record<string, string> = {
  W: "W",
  U: "U",
  B: "B",
  R: "R",
  G: "G",
  WU: "WU",
  UB: "UB",
  BR: "BR",
  RG: "RG",
  WG: "GW",
  WB: "WB",
  UR: "UR",
  BG: "BG",
  WR: "RW",
  UG: "GU",
  WUB: "WUB",
  UBR: "UBR",
  BRG: "BRG",
  WRG: "RGW",
  WUG: "GWU",
  WBG: "WBG",
  WUR: "URW",
  UBG: "BGU",
  WBR: "RWB",
  URG: "GUR",
  WUBR: "WUBR",
  UBRG: "UBRG",
  WBRG: "BRGW",
  WURG: "RGWU",
  WUBG: "GWUB",
  WUBRG: "WUBRG",
};
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
  const normalizedColorId = normalizeColorId(colorId);
  const gradientColorOrder = gradientColorOrders[normalizedColorId] ?? normalizedColorId;
  const colors = gradientColorOrder.split("")
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
      className="block h-28 rounded-lg shadow-md p-2 w-full text-black"
      style={deckBorderStyle(deck.colorId)}
    >
      <div className="bg-teal-100 rounded-md p-4 h-full flex flex-col justify-center gap-1">
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
          <div className="h-28 w-full rounded-lg border border-teal-700/60 p-2">
            <div className="flex h-full items-center justify-center rounded-md px-3 py-4 text-sm text-teal-100/70">
              No decks
            </div>
          </div>
        ) : (
          decks.map(deck => <DeckCard key={deck._id?.toString()} deck={deck} />)
        )}
      </div>
    </section>
  );
}

function DeckGrid({ decks }: { decks: Deck[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6 justify-items-stretch">
      {decks.map(deck => <DeckCard key={deck._id?.toString()} deck={deck} />)}
    </div>
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

  const builtDecks = useMemo(() => (
    visibleDecks.filter(deck => deck.together !== false)
  ), [visibleDecks]);

  const notBuiltDecks = useMemo(() => (
    visibleDecks.filter(deck => deck.together === false)
  ), [visibleDecks]);

  const edhColorGroups = useMemo(() => {
    const mainDecks = builtDecks.filter(deck => deck.mainForColorIdentity);
    const otherDecks = builtDecks.filter(deck => !deck.mainForColorIdentity);

    return {
      otherDecks,
      colorless: mainDecks.filter(deck => normalizeColorId(deck.colorId).length === 0),
      mono: Object.fromEntries(
        monoColorGroups.map(group => [
          group.colorId,
          mainDecks.filter(deck => normalizeColorId(deck.colorId) === group.colorId),
        ])
      ) as Record<string, Deck[]>,
      twoColor: Object.fromEntries(
        twoColorGroups.map(group => [
          group.colorId,
          mainDecks.filter(deck => normalizeColorId(deck.colorId) === group.colorId),
        ])
      ) as Record<string, Deck[]>,
      namedThreeColor: Object.fromEntries(
        threeColorGroups.map(group => [
          group.colorId,
          mainDecks.filter(deck => normalizeColorId(deck.colorId) === group.colorId),
        ])
      ) as Record<string, Deck[]>,
      namedFourColor: Object.fromEntries(
        fourColorGroups.map(group => [
          group.colorId,
          mainDecks.filter(deck => normalizeColorId(deck.colorId) === group.colorId),
        ])
      ) as Record<string, Deck[]>,
      fiveColor: mainDecks.filter(deck => normalizeColorId(deck.colorId).length === 5),
    };
  }, [builtDecks]);

  const showEdhColorView = formatFilter.toLowerCase() === "edh";
  const edhColorColumns = [
    monoColorGroups.map(group => ({
      title: group.label,
      decks: edhColorGroups.mono[group.colorId],
    })),
    twoColorGroups.slice(0, 5).map(group => ({
      title: group.label,
      decks: edhColorGroups.twoColor[group.colorId],
    })),
    twoColorGroups.slice(5).map(group => ({
      title: group.label,
      decks: edhColorGroups.twoColor[group.colorId],
    })),
    threeColorGroups.slice(0, 5).map(group => ({
      title: group.label,
      decks: edhColorGroups.namedThreeColor[group.colorId],
    })),
    threeColorGroups.slice(5).map(group => ({
      title: group.label,
      decks: edhColorGroups.namedThreeColor[group.colorId],
    })),
    fourColorGroups.map(group => ({
      title: group.label,
      decks: edhColorGroups.namedFourColor[group.colorId],
    })),
  ];

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
        <div className="flex flex-wrap justify-center gap-2">
          {session && authorization.canAddDecks(session.user?.permissionLevel) &&
            <Link href="/decks/new" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">New Deck</Link>
          }
          <Link href="/decks/proxies" className="bg-sky-600 text-white px-4 py-2 rounded hover:bg-sky-700">Proxy Report</Link>
        </div>

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
          <div className="mt-5 w-full max-w-[1600px] mx-auto text-white">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {edhColorColumns.map((column, index) => (
                <div key={index} className="space-y-5">
                  {column.map(group => (
                    <DeckGroup
                      key={group.title}
                      title={group.title}
                      decks={group.decks}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div className="xl:col-start-2">
                <DeckGroup title="Colorless" decks={edhColorGroups.colorless} />
              </div>
              <div className="xl:col-start-5">
                <DeckGroup title="5 color" decks={edhColorGroups.fiveColor} />
              </div>
            </div>

            {edhColorGroups.otherDecks.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 text-left text-lg font-semibold text-teal-100">
                  Other EDH Decks
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6 justify-items-stretch">
                  {edhColorGroups.otherDecks.map(deck => <DeckCard key={deck._id?.toString()} deck={deck} />)}
                </div>
              </section>
            )}

            {notBuiltDecks.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 text-left text-lg font-semibold text-teal-100">
                  Not Currently Built
                </h2>
                <DeckGrid decks={notBuiltDecks} />
              </section>
            )}
          </div>
        ) : (
          <div className="mt-5 w-full max-w-5xl mx-auto text-white">
            <DeckGrid decks={builtDecks} />
            {notBuiltDecks.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 text-left text-lg font-semibold text-teal-100">
                  Not Currently Built
                </h2>
                <DeckGrid decks={notBuiltDecks} />
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
