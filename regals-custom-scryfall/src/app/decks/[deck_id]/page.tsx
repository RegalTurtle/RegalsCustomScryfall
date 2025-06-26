"use client"

import authorization from "@/authorization";
import CardAddSystem from "@/components/CardAddSystem";
import CardEditModal from "@/components/CardEditModal";
import CardPiles from "@/components/CardPiles";
import RegalsMagicHeader from "@/components/RegalsMagicHeader"
import { Card, CardPile, Deck } from "@/types";
import { useSession } from "next-auth/react";
import { useParams } from 'next/navigation';
import { useEffect, useState } from "react";

function groupCardsByTags(cards: Card[]): CardPile[] {
  const pileMap: Record<string, Card[]> = {};

  for (const card of cards) {
    const tags = card.tag?.length ? card.tag : [`Untagged`];
    for (const tag of tags) {
      if (!pileMap[tag]) {
        pileMap[tag] = [];
      }
      pileMap[tag].push(card);
    }
  }

  return Object.entries(pileMap).map(([pileName, cards]) => ({
    pileName,
    cards: cards.sort((a, b) => a.name.localeCompare(b.name)),
  }));
}


export default function Decks() {
  const { data: session, status } = useSession();

  const { deck_id: deckId } = useParams();
  const [ deck, setDeck ] = useState<Deck | null>(null);
  const [ piles, setPiles ] = useState<CardPile[] | null>(null);
  const [ loadingDeck, setLoadingDeck ] = useState(true);

  const [ showFindModal, setShowFindModal ] = useState<boolean>(false);
  const [ update, sendUpdate ] = useState(0);

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

  return (
    <div className="flex flex-col min-h-screen bg-teal-900">
      <RegalsMagicHeader isHome={false} />

      <div className="text-center">
        <h1 className="text-xl font-bold">{deck.name}</h1>
        <p>Owner: {deck.owner}</p>
        <p>Format: {deck.format}</p>
      </div>

      {session && authorization.canAddCardsToCollection(session.user?.permissionLevel) && 
        <div className="mb-4 text-center mt-3">
          <button
            onClick={() => setShowFindModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            + Add a Card
          </button>
        </div>
      }

      <CardAddSystem
        showFindModal={showFindModal}
        setShowFindModal={setShowFindModal}
        update={update}
        sendUpdate={sendUpdate}
        collection_type={`decks+${deckId}`}
      />

      { piles && <CardPiles 
        piles={piles}
        setSelectedCard={setSelectedCard} 
      /> }

      {selectedCard && (
        <CardEditModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  )
}