"use client";
import { useSession } from "next-auth/react";
import { DragEvent, useEffect, useMemo, useState } from "react";
import RegalsMagicHeader from "@/components/RegalsMagicHeader";
import authorization from "@/authorization";
import CardAddSystem from "@/components/CardAddSystem";
import CardPiles from "@/components/CardPiles";
import { Card, CardPile } from "@/types";

type ScryfallCard = {
  name: string;
  set: string;
  collector_number: string;
  finishes: string[];
  image_uris?: { normal: string };
  card_faces?: Array<{
    image_uris?: { normal: string };
    oracle_text?: string;
    colors?: string[];
  }>;
  oracle_text?: string;
  colors?: string[];
  color_identity: string[];
  type_line: string;
  cmc: number;
  object?: string;
};

type DroppedCardLookup = {
  name?: string;
  set?: string;
  cn?: string;
  scryfallId?: string;
  moxfieldAssetUrl?: string;
};

type SetInfo = {
  name: string;
  released_at: string | null;
};

type SetSection = {
  setCode: string;
  setName: string;
  releasedAt: string | null;
  cards: Card[];
};

type WatchlistGroupPreferences = {
  tags: boolean;
  colors: boolean;
  sets: boolean;
};

const ignoredDragNames = new Set(["front", "back", "card", "image"]);
const WUBRG = ["W", "U", "B", "R", "G"];
const groupPreferencesCookieName = "watchlist_group_preferences";
const colorPileLabels: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
};

function sortCardsByName(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => a.name.localeCompare(b.name));
}

function groupCardsByTags(cards: Card[]): CardPile[] {
  const pileMap: Record<string, Card[]> = {};

  for (const card of cards) {
    const tags = card.tag?.length ? card.tag : ["Untagged"];
    for (const tag of tags) {
      if (!pileMap[tag]) {
        pileMap[tag] = [];
      }
      pileMap[tag].push(card);
    }
  }

  return Object.entries(pileMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([pileName, cards]) => ({
      pileName,
      cards: sortCardsByName(cards),
    }));
}

function getCardColorPileName(card: Card): string {
  const colors = new Set(card.color.replace(/[\s/]/g, "").split(""));
  const orderedColors = WUBRG.filter(color => colors.has(color));

  if (orderedColors.length === 0) return "Colorless";
  if (orderedColors.length === 1) return colorPileLabels[orderedColors[0]];
  return "Multicolor";
}

function groupCardsByColor(cards: Card[]): CardPile[] {
  const pileOrder = ["White", "Blue", "Black", "Red", "Green", "Multicolor", "Colorless"];
  const pileMap: Record<string, Card[]> = {};

  for (const card of cards) {
    const pileName = getCardColorPileName(card);
    if (!pileMap[pileName]) {
      pileMap[pileName] = [];
    }
    pileMap[pileName].push(card);
  }

  return pileOrder
    .filter(pileName => pileMap[pileName]?.length)
    .map(pileName => ({
      pileName,
      cards: sortCardsByName(pileMap[pileName]),
    }));
}

function groupCards(cards: Card[], options: { tags: boolean; colors: boolean }): CardPile[] {
  if (cards.length === 0) return [];

  if (options.tags) {
    return groupCardsByTags(cards);
  }

  if (options.colors) {
    return groupCardsByColor(cards);
  }

  return [{
    pileName: "Watchlist",
    cards: sortCardsByName(cards),
  }];
}

function groupCardsBySet(cards: Card[], setInfoByCode: Record<string, SetInfo>): SetSection[] {
  const sectionMap: Record<string, Card[]> = {};

  for (const card of cards) {
    const setCode = card.set.toLowerCase();
    if (!sectionMap[setCode]) {
      sectionMap[setCode] = [];
    }
    sectionMap[setCode].push(card);
  }

  return Object.entries(sectionMap)
    .map(([setCode, cards]) => {
      const setInfo = setInfoByCode[setCode];

      return {
        setCode,
        setName: setInfo?.name ?? setCode.toUpperCase(),
        releasedAt: setInfo?.released_at ?? null,
        cards,
      };
    })
    .sort((a, b) => {
      if (a.releasedAt && b.releasedAt) {
        return b.releasedAt.localeCompare(a.releasedAt);
      }
      if (a.releasedAt) return -1;
      if (b.releasedAt) return 1;
      return a.setCode.localeCompare(b.setCode);
    });
}

function countCards(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + card.quant, 0);
}

function getCookieValue(name: string): string | null {
  const cookie = document.cookie
    .split("; ")
    .find(cookiePart => cookiePart.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : null;
}

function loadGroupPreferences(): WatchlistGroupPreferences | null {
  const rawPreferences = getCookieValue(groupPreferencesCookieName);
  if (!rawPreferences) return null;

  try {
    const parsedPreferences = JSON.parse(rawPreferences);
    if (
      typeof parsedPreferences !== "object" ||
      parsedPreferences === null ||
      typeof parsedPreferences.tags !== "boolean" ||
      typeof parsedPreferences.colors !== "boolean" ||
      typeof parsedPreferences.sets !== "boolean"
    ) {
      return null;
    }

    return {
      tags: parsedPreferences.colors ? false : parsedPreferences.tags,
      colors: parsedPreferences.colors,
      sets: parsedPreferences.sets,
    };
  } catch {
    return null;
  }
}

function saveGroupPreferences(preferences: WatchlistGroupPreferences) {
  const oneYearInSeconds = 60 * 60 * 24 * 365;
  document.cookie = `${groupPreferencesCookieName}=${encodeURIComponent(JSON.stringify(preferences))}; path=/decks/watchlist; max-age=${oneYearInSeconds}; SameSite=Lax`;
}

function getCardImage(card: ScryfallCard): string {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? "";
}

function getCardOracle(card: ScryfallCard): string {
  return card.oracle_text ?? card.card_faces?.map(face => face.oracle_text ?? "").join(" // ") ?? "";
}

function getCardColors(card: ScryfallCard): string {
  if (card.colors) {
    return WUBRG.filter(c => card.colors?.includes(c)).join("");
  }

  if (card.card_faces && card.card_faces.length > 0) {
    return card.card_faces
      .map(face => WUBRG.filter(c => face.colors?.includes(c)).join(""))
      .join(" // ");
  }

  return "";
}

function getDroppedCardLookup(event: DragEvent): DroppedCardLookup {
  const getUsefulName = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (!trimmed || ignoredDragNames.has(trimmed.toLowerCase())) return undefined;
    return trimmed;
  };

  const parseSource = (source: string): DroppedCardLookup | null => {
    const decodedSource = decodeURIComponent(source);
    const scryfallId = decodedSource.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
    if (scryfallId) return { scryfallId };

    if (/assets\.moxfield\.net\/cards\/card-[^/?#]+/i.test(decodedSource)) {
      return { moxfieldAssetUrl: decodedSource };
    }

    const setCnPatterns = [
      /[?&#](?:set|s)=([A-Z0-9]{2,6}).*?[?&#](?:cn|collector(?:_number)?|number)=([A-Z0-9]+[-\w]*[a-z]?)/i,
      /(?:\(|\b)([A-Z0-9]{2,6})\)\s+([A-Z0-9]+[-\w]*[a-z]?)(?=\s|$|[/?&#)])/i,
    ];

    for (const pattern of setCnPatterns) {
      const setCnMatch = decodedSource.match(pattern);
      if (setCnMatch) {
        return {
          set: setCnMatch[1].toLowerCase(),
          cn: setCnMatch[2],
        };
      }
    }

    return null;
  };

  const html = event.dataTransfer.getData("text/html");
  if (html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const attributeValues = Array.from(doc.querySelectorAll("*"))
      .flatMap(element => Array.from(element.attributes).map(attribute => attribute.value))
      .filter((value): value is string => Boolean(value));

    let moxfieldAssetLookup: DroppedCardLookup | null = null;
    for (const attributeValue of attributeValues) {
      const parsed = parseSource(attributeValue);
      if (parsed?.moxfieldAssetUrl) {
        moxfieldAssetLookup = parsed;
        continue;
      }
      if (parsed) return parsed;
    }

    const image = doc.querySelector("img");
    const name = getUsefulName(image?.getAttribute("data-card-name"))
      ?? getUsefulName(image?.getAttribute("data-name"))
      ?? getUsefulName(image?.getAttribute("alt"))
      ?? getUsefulName(image?.getAttribute("title"))
      ?? getUsefulName(image?.getAttribute("aria-label"))
      ?? getUsefulName(doc.body.textContent);

    if (name) return { name };
    if (moxfieldAssetLookup) return moxfieldAssetLookup;
  }

  const plainText = event.dataTransfer.getData("text/plain").trim();
  if (plainText) {
    const parsed = parseSource(plainText);
    if (parsed) return parsed;
    const name = getUsefulName(plainText);
    if (name && !name.startsWith("http")) return { name };
  }

  return {};
}

function describeDroppedLookup(lookup: DroppedCardLookup): string {
  if (lookup.scryfallId) return `Scryfall ID ${lookup.scryfallId}`;
  if (lookup.set && lookup.cn) return `${lookup.set.toUpperCase()} ${lookup.cn}`;
  if (lookup.moxfieldAssetUrl) return "a Moxfield image URL without card identity";
  if (lookup.name) return lookup.name;
  return "nothing readable";
}

async function fetchDroppedScryfallCard(lookup: DroppedCardLookup): Promise<ScryfallCard> {
  if (lookup.scryfallId || (lookup.set && lookup.cn)) {
    const res = await fetch("/api/scryfall/card_lookup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(lookup),
    });
    const data = await res.json();

    if (!res.ok || !data.card) {
      throw new Error(data.error ?? `Dropped card lookup failed for ${describeDroppedLookup(lookup)}`);
    }

    return data.card;
  }

  if (!lookup.name) {
    if (lookup.moxfieldAssetUrl) {
      throw new Error("Moxfield image URLs do not include card name, set, or collector number.");
    }
    throw new Error(`Could not read set/collector number from the dropped card. Parsed ${describeDroppedLookup(lookup)}.`);
  }

  const params = new URLSearchParams({
    exact: lookup.name,
  });
  const res = await fetch(`https://api.scryfall.com/cards/named?${params.toString()}`);
  const data = await res.json();

  if (!res.ok || data.object === "error") {
    throw new Error(`${lookup.name} was not found on Scryfall`);
  }

  return data;
}

function buildCardFromScryfall(card: ScryfallCard): Card {
  return {
    name: card.name,
    quant: 1,
    set: card.set,
    cn: card.collector_number,
    foil: card.finishes.includes("nonfoil") ? "nonfoil" : card.finishes[0] as Card["foil"],
    proxy: false,
    updatedAt: null,
    image: getCardImage(card),
    oracle: getCardOracle(card),
    tag: [],
    color: getCardColors(card),
    color_identity: WUBRG.filter(c => card.color_identity.includes(c)).join(""),
    type: card.type_line,
    cmc: card.cmc,
  };
}

export default function DeckWatchlist() {
  const { data: session, status } = useSession();
  const [update, sendUpdate] = useState(0);
  const [showFindModal, setShowFindModal] = useState<boolean>(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const [removingCard, setRemovingCard] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [dropError, setDropError] = useState("");
  const [groupByTags, setGroupByTags] = useState(true);
  const [groupByColors, setGroupByColors] = useState(false);
  const [separateBySet, setSeparateBySet] = useState(false);
  const [loadedGroupPreferences, setLoadedGroupPreferences] = useState(false);
  const [setInfoByCode, setSetInfoByCode] = useState<Record<string, SetInfo>>({});

  useEffect(() => {
    async function fetchCards() {
      setLoadingCards(true);

      try {
        const res = await fetch("/api/collection/watchlist/card_page");
        if (!res.ok) throw new Error("Failed to fetch watchlist");
        const watchlistCards = await res.json();
        setCards(watchlistCards);
      } catch (error) {
        console.error("Failed to fetch watchlist", error);
      } finally {
        setLoadingCards(false);
      }
    }

    fetchCards();
  }, [update]);

  useEffect(() => {
    const savedPreferences = loadGroupPreferences();
    if (savedPreferences) {
      setGroupByTags(savedPreferences.tags);
      setGroupByColors(savedPreferences.colors);
      setSeparateBySet(savedPreferences.sets);
    }
    setLoadedGroupPreferences(true);
  }, []);

  useEffect(() => {
    if (!loadedGroupPreferences) return;

    saveGroupPreferences({
      tags: groupByTags,
      colors: groupByColors,
      sets: separateBySet,
    });
  }, [groupByTags, groupByColors, separateBySet, loadedGroupPreferences]);

  useEffect(() => {
    if (!separateBySet || cards.length === 0) return;

    const missingSetCodes = Array.from(new Set(cards.map(card => card.set.toLowerCase())))
      .filter(setCode => !setInfoByCode[setCode]);

    if (missingSetCodes.length === 0) return;

    let cancelled = false;

    async function fetchSetInfo() {
      const setInfoEntries = await Promise.all(
        missingSetCodes.map(async (setCode) => {
          try {
            const res = await fetch(`https://api.scryfall.com/sets/${setCode}`);
            if (!res.ok) throw new Error("Set lookup failed");
            const setInfo = await res.json();

            return [setCode, {
              name: setInfo.name ?? setCode.toUpperCase(),
              released_at: setInfo.released_at ?? null,
            }] as const;
          } catch {
            return [setCode, {
              name: setCode.toUpperCase(),
              released_at: null,
            }] as const;
          }
        })
      );

      if (cancelled) return;
      setSetInfoByCode(previousSetInfo => ({
        ...previousSetInfo,
        ...Object.fromEntries(setInfoEntries),
      }));
    }

    fetchSetInfo();

    return () => {
      cancelled = true;
    };
  }, [cards, separateBySet, setInfoByCode]);

  const removeSelectedCard = async () => {
    if (!selectedCard?._id) return;
    setRemovingCard(true);
    setRemoveError("");

    try {
      const res = await fetch("/api/collection/remove_card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collectionType: "watchlist",
          cardId: selectedCard._id.toString(),
          quant: selectedCard.quant,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Remove failed");
      }

      setSelectedCard(null);
      sendUpdate(update + 1);
    } catch (error) {
      setRemoveError(error instanceof Error ? error.message : "Remove failed");
    } finally {
      setRemovingCard(false);
    }
  };

  const addDroppedCard = async (event: DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    setDropError("");

    if (!session || !authorization.canAddCardsToCollection(session.user?.permissionLevel)) {
      setDropError("You need permission to add cards to the watchlist.");
      return;
    }

    try {
      const droppedCardLookup = getDroppedCardLookup(event);
      const scryfallCard = await fetchDroppedScryfallCard(droppedCardLookup);
      const card = buildCardFromScryfall(scryfallCard);
      const res = await fetch("/api/collection/watchlist/add_card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(card),
      });

      if (!res.ok) throw new Error(`Could not add ${card.name}`);
      sendUpdate(update + 1);
    } catch (error) {
      setDropError(error instanceof Error ? error.message : "Couldn't import card from image.");
    }
  };

  const piles = useMemo(() => (
    groupCards(cards, { tags: groupByTags, colors: groupByColors })
  ), [cards, groupByTags, groupByColors]);
  const setSections = useMemo(() => (
    groupCardsBySet(cards, setInfoByCode)
  ), [cards, setInfoByCode]);

  if (status === "loading" || loadingCards) return <p>Loading...</p>;

  return (
    <div className="flex flex-col min-h-screen bg-teal-900">
      <RegalsMagicHeader
        showBack={true}
        backUrl="/decks"
        backText="Decks"
      />

      <main
        className={`flex-1 px-4 text-center justify-items-center rounded ${dragActive ? "ring-4 ring-indigo-300 ring-offset-2 ring-offset-teal-900" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={addDroppedCard}
      >
        <h1 className="text-xl font-bold">Watchlist</h1>
        <p className="mb-4 text-teal-100">{`${countCards(cards)} card${countCards(cards) === 1 ? "" : "s"}`}</p>

        {dropError && (
          <p className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {dropError}
          </p>
        )}

        {session && authorization.canAddCardsToCollection(session.user?.permissionLevel) &&
          <div className="mb-4">
            <button
              onClick={() => setShowFindModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              + Add a Card
            </button>
          </div>
        }

        <div className="mb-4 flex w-full max-w-3xl flex-wrap items-center justify-center gap-3 rounded bg-teal-950/40 px-4 py-3 text-sm text-teal-50">
          <span className="font-semibold">Group by</span>
          <label className="flex items-center gap-2 rounded bg-teal-900 px-3 py-2">
            <input
              type="checkbox"
              checked={groupByTags}
              onChange={(event) => {
                setGroupByTags(event.target.checked);
                if (event.target.checked) setGroupByColors(false);
              }}
              className="h-4 w-4"
            />
            <span>Tags</span>
          </label>
          <label className="flex items-center gap-2 rounded bg-teal-900 px-3 py-2">
            <input
              type="checkbox"
              checked={groupByColors}
              onChange={(event) => {
                setGroupByColors(event.target.checked);
                if (event.target.checked) setGroupByTags(false);
              }}
              className="h-4 w-4"
            />
            <span>Colors</span>
          </label>
          <label className="flex items-center gap-2 rounded bg-teal-900 px-3 py-2">
            <input
              type="checkbox"
              checked={separateBySet}
              onChange={(event) => setSeparateBySet(event.target.checked)}
              className="h-4 w-4"
            />
            <span>Sets</span>
          </label>
        </div>

        {cards.length === 0 ? (
          <p className="rounded border border-teal-700/60 px-4 py-6 text-sm text-teal-100/80">
            No cards on the watchlist yet.
          </p>
        ) : separateBySet ? (
          <div className="flex w-full flex-col gap-10">
            {setSections.map(section => (
              <section key={section.setCode} className="text-center">
                <div className="mb-2">
                  <h2 className="text-lg font-semibold text-teal-50">{section.setName}</h2>
                  <p className="text-sm text-teal-100/80">
                    {`${section.setCode.toUpperCase()}${section.releasedAt ? ` - ${section.releasedAt}` : ""}`}
                  </p>
                </div>
                <CardPiles
                  piles={groupCards(section.cards, { tags: groupByTags, colors: groupByColors })}
                  setSelectedCard={setSelectedCard}
                  setHoveredCard={setHoveredCard}
                />
              </section>
            ))}
          </div>
        ) : (
          <CardPiles
            piles={piles}
            setSelectedCard={setSelectedCard}
            setHoveredCard={setHoveredCard}
          />
        )}
      </main>

      {hoveredCard && (
        <aside className="fixed left-[calc((100vw-1468px)/2-22rem)] top-32 z-40 hidden w-80 rounded bg-gray-900/95 p-3 text-white shadow-xl min-[2200px]:block">
          <img
            src={hoveredCard.image}
            alt={hoveredCard.name}
            className="w-full rounded-2xl"
          />
          <div className="mt-3 text-center">
            <p className="font-semibold">{hoveredCard.name}</p>
            <p className="text-sm text-gray-300">{`${hoveredCard.set.toUpperCase()} ${hoveredCard.cn}`}</p>
            {hoveredCard.quant > 1 && <p className="text-sm text-gray-300">{`x${hoveredCard.quant}`}</p>}
          </div>
        </aside>
      )}

      {selectedCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="collection-card-modal relative max-h-[90vh] w-[90%] max-w-md overflow-y-auto rounded-lg bg-gray-800 p-4 text-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute right-2 top-2 cursor-pointer text-xl text-white"
              onClick={() => setSelectedCard(null)}
            >
              x
            </button>

            <div className="flex flex-col items-center">
              <img
                src={selectedCard.image}
                alt={selectedCard.name}
                className="mb-4 w-72 rounded-xl shadow"
              />
              <h2 className="mb-1 text-center text-lg font-semibold">{selectedCard.name}</h2>
              <p className="mb-4 text-sm text-gray-300">
                {`${selectedCard.set.toUpperCase()} ${selectedCard.cn}`}
              </p>

              {selectedCard.oracle && (
                <p className="mb-4 whitespace-pre-wrap rounded bg-gray-700 p-3 text-left text-sm">
                  {selectedCard.oracle}
                </p>
              )}

              {session && authorization.canAddCardsToCollection(session.user?.permissionLevel) && (
                <div className="w-full rounded bg-gray-700 p-3">
                  <button
                    onClick={removeSelectedCard}
                    disabled={removingCard}
                    className="w-full rounded bg-red-700 px-4 py-2 text-white hover:bg-red-600 disabled:bg-gray-500"
                  >
                    {removingCard ? "Removing..." : "Remove from Watchlist"}
                  </button>
                  {removeError && <p className="mt-2 text-sm text-red-300">{removeError}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="h-16 bg-gray-900 text-white flex flex-col items-center justify-center mt-10 space-y-4">
      </footer>

      <CardAddSystem
        showFindModal={showFindModal}
        setShowFindModal={setShowFindModal}
        update={update}
        sendUpdate={sendUpdate}
        collection_type="watchlist"
      />
    </div>
  );
}
