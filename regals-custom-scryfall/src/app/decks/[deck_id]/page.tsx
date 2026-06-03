"use client"

import authorization from "@/authorization";
import CardAddSystem from "@/components/CardAddSystem";
import CardEditModal from "@/components/CardEditModal";
import CardPiles from "@/components/CardPiles";
import DeckBulkEditModal from "@/components/DeckBulkEditModal";
import RegalsMagicHeader from "@/components/RegalsMagicHeader"
import { Card, CardPile, CollectionTypeOption, Deck, GameStats, SerializedGame } from "@/types";
import { useSession } from "next-auth/react";
import { useParams } from 'next/navigation';
import { DragEvent, useEffect, useState } from "react";

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

const ignoredDragNames = new Set(["front", "back", "card", "image"]);

const WUBRG = ["W", "U", "B", "R", "G"];

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
    .sort(([a], [b]) => {
      if (a === "Commander") return -1;
      if (b === "Commander") return 1;
      return a.localeCompare(b)
    }) // Sort piles by pileName
    .map(([pileName, cards]) => ({
      pileName,
      cards: cards.sort((a, b) => a.name.localeCompare(b.name)), // Sort cards in each pile
    }));
}

function countCards(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + card.quant, 0);
}

function findCardImage(cards: Card[], cardName: string | null): string | null {
  if (!cardName) return null;
  return cards.find(card => card.name === cardName)?.image ?? null;
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
      throw new Error("Moxfield image URLs do not include card name, set, or collector number. Drag the card link/row if possible, use Scryfall, or use Bulk Edit from a Moxfield export line.");
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

export default function Decks() {
  const { data: session, status } = useSession();

  const { deck_id: deckId } = useParams();
  const [ deck, setDeck ] = useState<Deck | null>(null);
  const [ piles, setPiles ] = useState<CardPile[] | null>(null);
  const [ sidePiles, setSidePiles ] = useState<CardPile[] | null>(null);
  const [ maybePiles, setMaybePiles ] = useState<CardPile[] | null>(null);
  const [ wishPiles, setWishPiles ] = useState<CardPile[] | null>(null);
  const [ loadingDeck, setLoadingDeck ] = useState(true);

  const [ showFindModal, setShowFindModal ] = useState<boolean>(false);
  const [ showBulkEditModal, setShowBulkEditModal ] = useState<boolean>(false);
  const [ showFindSideModal, setShowFindSideModal ] = useState<boolean>(false);
  const [ showFindMaybeModal, setShowFindMaybeModal ] = useState<boolean>(false);
  const [ showFindWishModal, setShowFindWishModal ] = useState<boolean>(false);
  const [ update, sendUpdate ] = useState(0);
  const [ availableProxyKeys, setAvailableProxyKeys ] = useState<string[]>([]);
  const [ availableProxyLocations, setAvailableProxyLocations ] = useState<Record<string, string[]>>({});
  const [ ownedMaybeboardKeys, setOwnedMaybeboardKeys ] = useState<string[]>([]);
  const [ ownedMaybeboardLocations, setOwnedMaybeboardLocations ] = useState<Record<string, string[]>>({});
  const [ checkingProxies, setCheckingProxies ] = useState(false);
  const [ plannedCardOut, setPlannedCardOut ] = useState("");
  const [ plannedCardIn, setPlannedCardIn ] = useState("");
  const [ savingPlannedChange, setSavingPlannedChange ] = useState(false);
  const [ plannedChangeError, setPlannedChangeError ] = useState("");
  const [ dragTarget, setDragTarget ] = useState<CollectionTypeOption | null>(null);
  const [ dropError, setDropError ] = useState("");
  const [recentGames, setRecentGames] = useState<SerializedGame[]>([]);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedCardCollectionType, setSelectedCardCollectionType] = useState<CollectionTypeOption | null>(null);
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);

  useEffect(() => {
    if (!deckId) return;

    const fetchDeck  = async () => {
      try {
        const res = await fetch(`/api/decks/${deckId}`);
        if (!res.ok) throw new Error(`Failed to fetch deck`);
        const { foundDeck } = await res.json();
        setDeck(foundDeck);
        setPiles(groupCardsByTags(foundDeck.cards));
        setSidePiles(groupCardsByTags(foundDeck.sideboard));
        setMaybePiles(groupCardsByTags(foundDeck.maybeboard));
        setWishPiles(groupCardsByTags(foundDeck.wishlist));
        setAvailableProxyKeys([]);
        setAvailableProxyLocations({});
        setOwnedMaybeboardKeys([]);
        setOwnedMaybeboardLocations({});
      } catch (error) {
        console.error(`Error fetching deck:`, error);
      } finally {
        setLoadingDeck(false);
      }
    }

    fetchDeck();
  }, [ update ]);

  useEffect(() => {
    if (!deckId) return;

    async function fetchDeckGames() {
      try {
        const res = await fetch(`/api/games?deckId=${deckId}`);
        if (!res.ok) throw new Error("Failed to fetch games");
        const { games, stats } = await res.json();
        setRecentGames(games ?? []);
        setGameStats(stats ?? null);
      } catch (error) {
        console.error("Error fetching deck games:", error);
      }
    }

    fetchDeckGames();
  }, [deckId, update]);

  if (loadingDeck) return <p>Loading...</p>;
  if (!deck) return <p>Deck not found</p>;

  const checkAvailableProxies = async () => {
    setCheckingProxies(true);

    try {
      const res = await fetch(`/api/decks/${deckId}/available_proxies`);
      if (!res.ok) throw new Error("Failed to check proxies");
      const { availableProxyKeys, availableProxyLocations, ownedMaybeboardKeys, ownedMaybeboardLocations } = await res.json();
      setAvailableProxyKeys(availableProxyKeys);
      setAvailableProxyLocations(availableProxyLocations ?? {});
      setOwnedMaybeboardKeys(ownedMaybeboardKeys ?? []);
      setOwnedMaybeboardLocations(ownedMaybeboardLocations ?? {});
    } catch (error) {
      console.error("Error checking proxies:", error);
    } finally {
      setCheckingProxies(false);
    }
  };

  const deckCardNames = Array.from(new Set(deck.cards.map(card => card.name))).sort((a, b) => a.localeCompare(b));
  const maybeboardCardNames = Array.from(new Set([
    ...deck.maybeboard.map(card => card.name),
    ...deck.wishlist.map(card => card.name),
  ])).sort((a, b) => a.localeCompare(b));

  const selectCardFromCollection = (card: Card, collectionType: CollectionTypeOption) => {
    setSelectedCard(card);
    setSelectedCardCollectionType(collectionType);
  };

  const addDroppedCard = async (event: DragEvent, collectionType: CollectionTypeOption) => {
    event.preventDefault();
    setDragTarget(null);
    setDropError("");

    try {
      const droppedCardLookup = getDroppedCardLookup(event);
      const scryfallCard = await fetchDroppedScryfallCard(droppedCardLookup);
      const card = buildCardFromScryfall(scryfallCard);
      const res = await fetch(`/api/collection/${collectionType}/add_card`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(card),
      });

      if (!res.ok) throw new Error(`Could not add ${card.name}`);
      sendUpdate(update + 1);
    } catch {
      setDropError("Couldn't import card from image.");
    }
  };

  const dropTargetClass = (collectionType: CollectionTypeOption) => (
    dragTarget === collectionType ? "ring-4 ring-indigo-300 ring-offset-2 ring-offset-teal-900" : ""
  );

  const addPlannedChange = async () => {
    setSavingPlannedChange(true);
    setPlannedChangeError("");

    try {
      const res = await fetch(`/api/decks/${deckId}/planned_changes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardOut: plannedCardOut,
          cardIn: plannedCardIn,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to add planned swap");
      }

      setPlannedCardOut("");
      setPlannedCardIn("");
      sendUpdate(update + 1);
    } catch (error) {
      setPlannedChangeError(error instanceof Error ? error.message : "Failed to add planned swap");
    } finally {
      setSavingPlannedChange(false);
    }
  };

  const removePlannedChange = async (changeIndex: number) => {
    setPlannedChangeError("");

    try {
      const res = await fetch(`/api/decks/${deckId}/planned_changes`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ changeIndex }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to remove planned swap");
      }

      sendUpdate(update + 1);
    } catch (error) {
      setPlannedChangeError(error instanceof Error ? error.message : "Failed to remove planned swap");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-teal-900">
      <RegalsMagicHeader 
        showBack={true}
        backUrl="/decks"
        backText="Decks"
      />

      {/* Deck Info Centered, Settings Button Right */}
      <div className="relative py-4">
        {/* Centered Deck Info */}
        <div className="text-center mx-auto">
          <h1 className="text-xl font-bold">{deck.name}</h1>
          <p>Owner: {deck.owner}</p>
          <p>Format: {deck.format}</p>
        </div>

        {/* Settings Button on the Right */}
        {session && authorization.canAddDecks(session.user?.permissionLevel) && 
          <a
            href={`/decks/${deck._id}/settings`}
            className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-gray-200 text-black px-4 py-2 rounded hover:bg-gray-300 transition"
          >
            Settings
          </a>
        }
      </div>

      {dropError && (
        <div className="fixed right-4 top-4 z-[300] max-w-sm rounded border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-lg">
          <button
            onClick={() => setDropError("")}
            className="absolute right-2 top-1 text-lg leading-none"
            aria-label="Dismiss import error"
          >
            x
          </button>
          <p className="pr-5">{dropError}</p>
        </div>
      )}

      {deck.notes?.trim() && (
        <section className="mx-auto mb-4 w-full max-w-4xl px-4 text-left">
          <div className="rounded bg-teal-950/40 p-4 text-teal-50">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Notes</h2>
              {session && authorization.canAddDecks(session.user?.permissionLevel) && (
                <a
                  href={`/decks/${deck._id}/settings`}
                  className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
                >
                  Edit
                </a>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6">{deck.notes}</p>
          </div>
        </section>
      )}

      { piles && (<div 
        className={`text-center rounded ${dropTargetClass(`decks+${deckId}`)}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragTarget(`decks+${deckId}`);
        }}
        onDragLeave={() => setDragTarget(null)}
        onDrop={(e) => addDroppedCard(e, `decks+${deckId}`)}
      >
        <p className="text-lg ml-5">{`Decklist (${countCards(deck.cards)})`}</p>
        {session && authorization.canAddCardsToCollection(session.user?.permissionLevel) && 
          <div className="mb-1 mt-1 ml-5 flex justify-center gap-2">
            <button
              onClick={() => setShowFindModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              + Add a Card
            </button>
            <button
              onClick={() => setShowBulkEditModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              Bulk Edit
            </button>
            <button
              onClick={checkAvailableProxies}
              disabled={checkingProxies}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {checkingProxies ? "Checking..." : "Check Proxies"}
            </button>
          </div>
        }
        <CardPiles 
          piles={piles}
          setSelectedCard={(card) => selectCardFromCollection(card, `decks+${deckId}`)}
          setHoveredCard={setHoveredCard}
          availableProxyKeys={availableProxyKeys}
          availableProxyLocations={availableProxyLocations}
        /> 
      </div>) }

      { sidePiles && (<div 
        className={`text-center rounded ${dropTargetClass(`decks+sideboard+${deckId}`)}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragTarget(`decks+sideboard+${deckId}`);
        }}
        onDragLeave={() => setDragTarget(null)}
        onDrop={(e) => addDroppedCard(e, `decks+sideboard+${deckId}`)}
      >
        <p className="text-lg ml-5">Sideboard</p>
        {session && authorization.canAddCardsToCollection(session.user?.permissionLevel) && 
          <div className="mb-1 mt-1 ml-5">
            <button
              onClick={() => setShowFindSideModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              + Add a Card
            </button>
          </div>
        }
        <CardPiles 
          piles={sidePiles}
          setSelectedCard={(card) => selectCardFromCollection(card, `decks+sideboard+${deckId}`)}
          setHoveredCard={setHoveredCard}
        /> 
      </div>) }

      <div className="mx-auto mb-6 w-full max-w-4xl px-4 text-center">
        <p className="text-lg ml-5">Planned Swaps</p>

        {session && authorization.canAddDecks(session.user?.permissionLevel) && (
          <div className="mx-auto mt-2 flex max-w-4xl flex-col gap-2 rounded bg-teal-950/40 p-4 text-left md:flex-row md:items-end">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span>Out of deck</span>
              <select
                value={plannedCardOut}
                onChange={(e) => setPlannedCardOut(e.target.value)}
                className="rounded border border-teal-700 bg-teal-100 px-3 py-2 text-black"
              >
                <option value="">Choose card</option>
                {deckCardNames.map(cardName => (
                  <option key={cardName} value={cardName}>{cardName}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span>Into deck</span>
              <select
                value={plannedCardIn}
                onChange={(e) => setPlannedCardIn(e.target.value)}
                className="rounded border border-teal-700 bg-teal-100 px-3 py-2 text-black"
              >
                <option value="">Choose maybeboard card</option>
                {maybeboardCardNames.map(cardName => (
                  <option key={cardName} value={cardName}>{cardName}</option>
                ))}
              </select>
            </label>

            <button
              onClick={addPlannedChange}
              disabled={savingPlannedChange || !plannedCardOut || !plannedCardIn.trim()}
              className="whitespace-nowrap bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {savingPlannedChange ? "Saving..." : "Add Swap"}
            </button>
          </div>
        )}

        {plannedChangeError && (
          <p className="mx-auto mt-2 max-w-3xl rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {plannedChangeError}
          </p>
        )}

        <div className="mx-auto mt-3 grid max-w-3xl grid-cols-1 gap-3">
          {deck.changes.length === 0 ? (
            <p className="rounded border border-teal-700/60 px-3 py-4 text-sm text-teal-100/80">
              No planned swaps yet.
            </p>
          ) : (
            deck.changes.map((change, index) => {
              const outImage = findCardImage(deck.cards, change.cardOut);
              const inImage = findCardImage([...deck.maybeboard, ...deck.wishlist], change.cardIn);

              return (
                <div key={`${change.cardOut}-${change.cardIn}-${index}`} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 rounded bg-teal-100 p-3 text-black shadow">
                  <div className="group relative">
                    <p className="text-xs font-semibold uppercase text-red-700">Out</p>
                    <p className="font-medium">{change.cardOut}</p>
                    {outImage && (
                      <img
                        src={outImage}
                        alt={change.cardOut ?? "Card out"}
                        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-56 -translate-x-1/2 rounded-lg shadow-xl group-hover:block"
                      />
                    )}
                  </div>
                  <span className="text-lg font-bold">→</span>
                  <div className="group relative">
                    <p className="text-xs font-semibold uppercase text-green-700">In</p>
                    <p className="font-medium">{change.cardIn}</p>
                    {inImage && (
                      <img
                        src={inImage}
                        alt={change.cardIn ?? "Card in"}
                        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-56 -translate-x-1/2 rounded-lg shadow-xl group-hover:block"
                      />
                    )}
                  </div>
                  {session && authorization.canAddDecks(session.user?.permissionLevel) && (
                    <button
                      onClick={() => removePlannedChange(index)}
                      className="rounded bg-red-700 px-3 py-1 text-sm text-white hover:bg-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      { maybePiles && (<div 
        className={`text-center rounded ${dropTargetClass(`decks+maybeboard+${deckId}`)}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragTarget(`decks+maybeboard+${deckId}`);
        }}
        onDragLeave={() => setDragTarget(null)}
        onDrop={(e) => addDroppedCard(e, `decks+maybeboard+${deckId}`)}
      >
        <p className="text-lg ml-5">Physical Maybeboard</p>
        {session && authorization.canAddCardsToCollection(session.user?.permissionLevel) && 
          <div className="mb-1 mt-1 ml-5">
            <button
              onClick={() => setShowFindMaybeModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              + Add a Card
            </button>
          </div>
        }
        <CardPiles 
          piles={maybePiles}
          setSelectedCard={(card) => selectCardFromCollection(card, `decks+maybeboard+${deckId}`)}
          setHoveredCard={setHoveredCard}
        /> 
      </div>) }

      { wishPiles && (<div 
        className={`text-center rounded ${dropTargetClass(`decks+wishlist+${deckId}`)}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragTarget(`decks+wishlist+${deckId}`);
        }}
        onDragLeave={() => setDragTarget(null)}
        onDrop={(e) => addDroppedCard(e, `decks+wishlist+${deckId}`)}
      >
        <p className="text-lg ml-5">Online Maybeboard</p>
        {session && authorization.canAddCardsToCollection(session.user?.permissionLevel) && 
          <div className="mb-1 mt-1 ml-5">
            <button
              onClick={() => setShowFindWishModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              + Add a Card
            </button>
          </div>
        }
        <CardPiles 
          piles={wishPiles}
          setSelectedCard={(card) => selectCardFromCollection(card, `decks+wishlist+${deckId}`)}
          setHoveredCard={setHoveredCard}
          ownedCardKeys={ownedMaybeboardKeys}
          ownedCardLocations={ownedMaybeboardLocations}
        /> 
      </div>) }

      <section className="mx-auto mb-6 mt-4 w-full max-w-4xl px-4 text-left">
        <div className="rounded bg-teal-950/40 p-4 text-teal-50">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Games</h2>
              {gameStats && (
                <p className="text-sm text-teal-100/80">
                  {`${gameStats.total} logged - ${gameStats.wins}/${gameStats.losses}/${gameStats.ties} - ${Math.round(gameStats.winRate * 100)}% win rate`}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <a
                href={`/games?deckId=${deckId}`}
                className="rounded bg-teal-100 px-3 py-1 text-sm text-teal-950 hover:bg-white"
              >
                View Games
              </a>
              {session && authorization.canAddGames(session.user?.permissionLevel) && (
                <a
                  href={`/games?deckId=${deckId}&add=1`}
                  className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
                >
                  Add Game
                </a>
              )}
            </div>
          </div>
          {recentGames.length === 0 ? (
            <p className="text-sm text-teal-100/70">No games logged for this deck yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {recentGames.map(game => (
                <div key={game._id} className="grid grid-cols-[auto_auto_1fr] items-start gap-3 rounded bg-teal-900/70 px-3 py-2 text-sm">
                  <span className="font-medium">{game.date}</span>
                  <span className={`rounded px-2 py-1 text-xs font-semibold ${game.result === "win" ? "bg-emerald-600" : game.result === "loss" ? "bg-red-700" : "bg-sky-700"}`}>
                    {game.result === "win" ? "Win" : game.result === "loss" ? "Loss" : "Tie"}
                  </span>
                  <span className="text-teal-100/90">
                    {`${game.numPlayers} players${game.turnNumber ? `, turn ${game.turnNumber}` : ""}${game.notes ? ` - ${game.notes}` : ""}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

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

      {selectedCard && selectedCardCollectionType && (
        <CardEditModal
          card={selectedCard}
          onClose={() => {
            setSelectedCard(null);
            setSelectedCardCollectionType(null);
          }}
          update={update}
          sendUpdate={sendUpdate}
          deckId={deckId?.toString() as string}
          collectionType={selectedCardCollectionType}
        />
      )}

      <CardAddSystem
        showFindModal={showFindModal}
        setShowFindModal={setShowFindModal}
        update={update}
        sendUpdate={sendUpdate}
        collection_type={`decks+${deckId}`}
      />

      <DeckBulkEditModal
        show={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        deckId={deckId?.toString() as string}
        update={update}
        sendUpdate={sendUpdate}
        collectionType={`decks+${deckId}`}
      />

      <CardAddSystem
        showFindModal={showFindSideModal}
        setShowFindModal={setShowFindSideModal}
        update={update}
        sendUpdate={sendUpdate}
        collection_type={`decks+sideboard+${deckId}`}
      />

      <CardAddSystem
        showFindModal={showFindMaybeModal}
        setShowFindModal={setShowFindMaybeModal}
        update={update}
        sendUpdate={sendUpdate}
        collection_type={`decks+maybeboard+${deckId}`}
      />

      <CardAddSystem
        showFindModal={showFindWishModal}
        setShowFindModal={setShowFindWishModal}
        update={update}
        sendUpdate={sendUpdate}
        collection_type={`decks+wishlist+${deckId}`}
      />
    </div>
  )
}
