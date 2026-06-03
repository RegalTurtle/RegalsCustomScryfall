import { NextRequest, NextResponse } from "next/server";
import { bulkCards, coolCards, decks, tradeBinder } from "@/config/mongoCollections";
import { Card, Deck } from "@/types";
import { cardMatchesParsedSearch, parseCardSearchTerms } from "@/utils/cardSearch";

type OwnedCollection = "bulk" | "cool-cards" | "trade-binder";

const collectionLabels: Record<OwnedCollection, string> = {
  "bulk": "Bulk",
  "cool-cards": "Cool Cards",
  "trade-binder": "Trade Binder",
};

function cardKey(card: Card) {
  return card.name;
}

function serializeCard(card: Card, collection?: OwnedCollection) {
  return {
    ...card,
    _id: card._id?.toString(),
    collection,
    collectionLabel: collection ? collectionLabels[collection] : undefined,
  };
}

function proxyReportMatchesSearch(
  item: {
    card: ReturnType<typeof serializeCard>;
    decks: Array<{ deckId: string; deckName: string; quantity: number }>;
    ownedCopies: ReturnType<typeof serializeCard>[];
    locations: (string | undefined)[];
    totalOwned: number;
    totalProxies: number;
  },
  searchTerms: string,
) {
  return cardMatchesParsedSearch(item.card as Card, parseCardSearchTerms(searchTerms), {
    quantity: item.totalProxies,
    totalOwned: item.totalOwned,
    textValues: [
      ...item.decks.map(deck => deck.deckName),
      ...item.locations,
    ],
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchTerms = request.nextUrl.searchParams.get("search")?.trim() ?? "";
    const decksCollection = await decks();
    const allDecks = await decksCollection.find({ together: { $ne: false } }).toArray();
    const proxyCardsByName = new Map<string, {
      card: Card;
      decks: Array<{ deckId: string; deckName: string; quantity: number }>;
    }>();

    for (const deck of allDecks as Deck[]) {
      for (const card of deck.cards.filter(card => card.proxy)) {
        const key = cardKey(card);
        const existing = proxyCardsByName.get(key);

        if (existing) {
          existing.decks.push({
            deckId: deck._id?.toString() ?? "",
            deckName: deck.name,
            quantity: card.quant,
          });
        } else {
          proxyCardsByName.set(key, {
            card,
            decks: [{
              deckId: deck._id?.toString() ?? "",
              deckName: deck.name,
              quantity: card.quant,
            }],
          });
        }
      }
    }

    const proxyNames = Array.from(proxyCardsByName.keys());

    if (proxyNames.length === 0) {
      return NextResponse.json({ proxyReport: [] }, { status: 200 });
    }

    const bulkCardsCollection = await bulkCards();
    const coolCardsCollection = await coolCards();
    const tradeBinderCollection = await tradeBinder();

    const [bulkMatches, coolMatches, tradeMatches] = await Promise.all([
      bulkCardsCollection.find({ name: { $in: proxyNames }, quant: { $gt: 0 } }).sort({ name: 1, set: 1, cn: 1 }).toArray(),
      coolCardsCollection.find({ name: { $in: proxyNames }, quant: { $gt: 0 } }).sort({ name: 1, set: 1, cn: 1 }).toArray(),
      tradeBinderCollection.find({ name: { $in: proxyNames }, quant: { $gt: 0 } }).sort({ name: 1, set: 1, cn: 1 }).toArray(),
    ]);

    const ownedCopiesByName = new Map<string, ReturnType<typeof serializeCard>[]>();
    const addOwnedCopy = (card: Card, collection: OwnedCollection) => {
      const copies = ownedCopiesByName.get(card.name) ?? [];
      copies.push(serializeCard(card, collection));
      ownedCopiesByName.set(card.name, copies);
    };

    bulkMatches.forEach(card => addOwnedCopy(card, "bulk"));
    coolMatches.forEach(card => addOwnedCopy(card, "cool-cards"));
    tradeMatches.forEach(card => addOwnedCopy(card, "trade-binder"));

    let proxyReport = Array.from(proxyCardsByName.values())
      .map(({ card, decks }) => {
        const ownedCopies = ownedCopiesByName.get(card.name) ?? [];
        const locations = Array.from(new Set(ownedCopies.map(copy => copy.collectionLabel).filter(Boolean)));
        const totalOwned = ownedCopies.reduce((sum, copy) => sum + copy.quant, 0);
        const totalProxies = decks.reduce((sum, deck) => sum + deck.quantity, 0);

        return {
          card: serializeCard(card),
          decks,
          ownedCopies,
          locations,
          totalOwned,
          totalProxies,
        };
      })
      .sort((a, b) => a.card.name.localeCompare(b.card.name));

    if (searchTerms) {
      proxyReport = proxyReport.filter(item => proxyReportMatchesSearch(item, searchTerms));
    }

    return NextResponse.json({ proxyReport }, { status: 200 });
  } catch (err) {
    console.error("Error building proxy report:", err);
    return NextResponse.json({ error: "Proxy report failed" }, { status: 500 });
  }
}
