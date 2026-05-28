"use client"

import authorization from "@/authorization";
import CardAddSystem from "@/components/CardAddSystem";
import CardEditModal from "@/components/CardEditModal";
import CardPiles from "@/components/CardPiles";
import DeckBulkEditModal from "@/components/DeckBulkEditModal";
import RegalsMagicHeader from "@/components/RegalsMagicHeader"
import { Card, CardPile, CollectionTypeOption, Deck } from "@/types";
import { useSession } from "next-auth/react";
import { useParams } from 'next/navigation';
import { useEffect, useState } from "react";

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
  const [ checkingProxies, setCheckingProxies ] = useState(false);
  const [ plannedCardOut, setPlannedCardOut ] = useState("");
  const [ plannedCardIn, setPlannedCardIn ] = useState("");
  const [ savingPlannedChange, setSavingPlannedChange ] = useState(false);
  const [ plannedChangeError, setPlannedChangeError ] = useState("");

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedCardCollectionType, setSelectedCardCollectionType] = useState<CollectionTypeOption | null>(null);

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
      } catch (error) {
        console.error(`Error fetching deck:`, error);
      } finally {
        setLoadingDeck(false);
      }
    }

    fetchDeck();
  }, [ update ]);

  if (loadingDeck) return <p>Loading...</p>;
  if (!deck) return <p>Deck not found</p>;

  const checkAvailableProxies = async () => {
    setCheckingProxies(true);

    try {
      const res = await fetch(`/api/decks/${deckId}/available_proxies`);
      if (!res.ok) throw new Error("Failed to check proxies");
      const { availableProxyKeys, availableProxyLocations } = await res.json();
      setAvailableProxyKeys(availableProxyKeys);
      setAvailableProxyLocations(availableProxyLocations ?? {});
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

      { piles && (<div className="text-center">
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
          availableProxyKeys={availableProxyKeys}
          availableProxyLocations={availableProxyLocations}
        /> 
      </div>) }

      { sidePiles && (<div className="text-center">
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

      { maybePiles && (<div className="text-center">
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
        /> 
      </div>) }

      { wishPiles && (<div className="text-center">
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
        /> 
      </div>) }

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
