import type { Card, Deck } from "@/types";

export type ProxyDeckEntry = {
  name: string;
  quantity: number;
  card: Card;
  deckId: string;
  deckName: string;
};

const sumProxyCopies = (cards: Card[] | undefined, cardName: string): number =>
  (cards ?? []).reduce((total, card) => {
    if (card.name === cardName && card.proxy) {
      return total + card.quant;
    }
    return total;
  }, 0);

export function getNetProxyCardsForDeck(deck: Deck): ProxyDeckEntry[] {
  const counts = new Map<string, { card: Card; quantity: number }>();

  const addToCounts = (card: Card, delta: number) => {
    if (!card.name) {
      return;
    }

    const current = counts.get(card.name) ?? { card, quantity: 0 };
    const nextQuantity = current.quantity + delta;

    if (nextQuantity <= 0) {
      counts.delete(card.name);
      return;
    }

    counts.set(card.name, {
      card,
      quantity: nextQuantity,
    });
  };

  for (const card of deck.cards ?? []) {
    if (card.proxy) {
      addToCounts(card, card.quant);
    }
  }

  const incomingSources = [...(deck.maybeboard ?? []), ...(deck.wishlist ?? []), ...(deck.sideboard ?? [])];

  for (const change of deck.changes ?? []) {
    if (change.cardOut) {
      const outgoingQuantity = sumProxyCopies(deck.cards, change.cardOut);
      if (outgoingQuantity > 0) {
        const outgoingCard = (deck.cards ?? []).find(card => card.name === change.cardOut && card.proxy) ?? { name: change.cardOut, quant: outgoingQuantity, set: "", cn: "", foil: "nonfoil", proxy: true, updatedAt: null, image: "", oracle: "", color: "", color_identity: "", type: "", cmc: 0 };
        addToCounts(outgoingCard, -outgoingQuantity);
      }
    }

    if (change.cardIn) {
      const incomingQuantity = sumProxyCopies(incomingSources, change.cardIn);
      if (incomingQuantity > 0) {
        const incomingCard = incomingSources.find(card => card.name === change.cardIn && card.proxy) ?? {
          name: change.cardIn,
          quant: incomingQuantity,
          set: "",
          cn: "",
          foil: "nonfoil",
          proxy: true,
          updatedAt: null,
          image: "",
          oracle: "",
          color: "",
          color_identity: "",
          type: "",
          cmc: 0,
        };
        addToCounts(incomingCard, incomingQuantity);
      }
    }
  }

  return Array.from(counts.entries()).map(([name, value]) => ({
    name,
    quantity: value.quantity,
    card: value.card,
    deckId: deck._id?.toString() ?? "",
    deckName: deck.name,
  }));
}
