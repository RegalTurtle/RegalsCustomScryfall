"use client"

import authorization from "@/authorization";
import CardAddSystem from "@/components/CardAddSystem";
import CardEditModal from "@/components/CardEditModal";
import CardPiles from "@/components/CardPiles";
import DeckBulkEditModal from "@/components/DeckBulkEditModal";
import RegalsMagicHeader from "@/components/RegalsMagicHeader"
import { Card, CardPile, Deck } from "@/types";
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

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

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
        <p className="text-lg ml-5">Decklist</p>
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
          setSelectedCard={setSelectedCard} 
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
          setSelectedCard={setSelectedCard} 
        /> 
      </div>) }

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
          setSelectedCard={setSelectedCard} 
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
          setSelectedCard={setSelectedCard} 
        /> 
      </div>) }

      {selectedCard && (
        <CardEditModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          update={update}
          sendUpdate={sendUpdate}
          deckId={deckId?.toString() as string}
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
