import { NextRequest, NextResponse } from "next/server";
import { bulkCards, coolCards } from "@/config/mongoCollections";
import deckData from "@/data/decks";
import { Card } from "@/types";

const cardKey = (card: Card) => `${card.set}|${card.cn}`;

export async function GET(
  request: NextRequest,
  { params }: { params: { deck_id: string } }
): Promise<NextResponse> {
  const { deck_id } = await params;

  try {
    const deck = await deckData.findDeckByMongoId(deck_id);
    if (!deck) return NextResponse.json({ error: "Deck not found" }, { status: 404 });

    const proxyCards = deck.cards.filter(card => card.proxy);
    const proxyNames = Array.from(new Set(proxyCards.map(card => card.name)));

    if (proxyNames.length === 0) {
      return NextResponse.json({ availableProxyKeys: [] }, { status: 200 });
    }

    const bulkCardsCollection = await bulkCards();
    const coolCardsCollection = await coolCards();

    const [bulkMatches, coolMatches] = await Promise.all([
      bulkCardsCollection.find({ name: { $in: proxyNames }, quant: { $gt: 0 } }).project({ name: 1 }).toArray(),
      coolCardsCollection.find({ name: { $in: proxyNames }, quant: { $gt: 0 } }).project({ name: 1 }).toArray(),
    ]);

    const bulkNames = new Set(bulkMatches.map(card => card.name));
    const coolNames = new Set(coolMatches.map(card => card.name));
    const availableNames = new Set([
      ...bulkNames,
      ...coolNames,
    ]);

    const availableProxyKeys = proxyCards
      .filter(card => availableNames.has(card.name))
      .map(cardKey);
    const availableProxyLocations = Object.fromEntries(
      proxyCards
        .filter(card => availableNames.has(card.name))
        .map(card => [
          cardKey(card),
          [
            ...(bulkNames.has(card.name) ? ["Bulk"] : []),
            ...(coolNames.has(card.name) ? ["Cool Cards"] : []),
          ],
        ])
    );

    return NextResponse.json({ availableProxyKeys, availableProxyLocations }, { status: 200 });
  } catch (err) {
    console.error("Error checking available proxies:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
