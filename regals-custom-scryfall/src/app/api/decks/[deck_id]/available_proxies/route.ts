import { NextRequest, NextResponse } from "next/server";
import { bulkCards, coolCards, tradeBinder } from "@/config/mongoCollections";
import deckData from "@/data/decks";
import { Card } from "@/types";

const cardKey = (card: Card) => `${card.set}|${card.cn}`;

function getCollectionLocations(
  cardName: string,
  bulkNames: Set<string>,
  coolNames: Set<string>,
  tradeNames: Set<string>,
) {
  return [
    ...(bulkNames.has(cardName) ? ["Bulk"] : []),
    ...(coolNames.has(cardName) ? ["Cool Cards"] : []),
    ...(tradeNames.has(cardName) ? ["Trade Binder"] : []),
  ];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { deck_id: string } }
): Promise<NextResponse> {
  const { deck_id } = await params;

  try {
    const deck = await deckData.findDeckByMongoId(deck_id);
    if (!deck) return NextResponse.json({ error: "Deck not found" }, { status: 404 });

    const proxyCards = deck.cards.filter(card => card.proxy);
    const onlineMaybeboardCards = deck.wishlist ?? [];
    const proxyNames = Array.from(new Set(proxyCards.map(card => card.name)));
    const onlineMaybeboardNames = Array.from(new Set(onlineMaybeboardCards.map(card => card.name)));
    const cardNamesToCheck = Array.from(new Set([
      ...proxyNames,
      ...onlineMaybeboardNames,
    ]));

    if (cardNamesToCheck.length === 0) {
      return NextResponse.json({
        availableProxyKeys: [],
        availableProxyLocations: {},
        ownedMaybeboardKeys: [],
        ownedMaybeboardLocations: {},
      }, { status: 200 });
    }

    const bulkCardsCollection = await bulkCards();
    const coolCardsCollection = await coolCards();
    const tradeBinderCollection = await tradeBinder();

    const [bulkMatches, coolMatches, tradeMatches] = await Promise.all([
      bulkCardsCollection.find({ name: { $in: cardNamesToCheck }, quant: { $gt: 0 } }).project({ name: 1 }).toArray(),
      coolCardsCollection.find({ name: { $in: cardNamesToCheck }, quant: { $gt: 0 } }).project({ name: 1 }).toArray(),
      tradeBinderCollection.find({ name: { $in: cardNamesToCheck }, quant: { $gt: 0 } }).project({ name: 1 }).toArray(),
    ]);

    const bulkNames = new Set(bulkMatches.map(card => card.name));
    const coolNames = new Set(coolMatches.map(card => card.name));
    const tradeNames = new Set(tradeMatches.map(card => card.name));
    const availableNames = new Set([
      ...bulkNames,
      ...coolNames,
      ...tradeNames,
    ]);

    const availableProxyKeys = proxyCards
      .filter(card => availableNames.has(card.name))
      .map(cardKey);
    const availableProxyLocations = Object.fromEntries(
      proxyCards
        .filter(card => availableNames.has(card.name))
        .map(card => [
          cardKey(card),
          getCollectionLocations(card.name, bulkNames, coolNames, tradeNames),
        ])
    );
    const ownedMaybeboardKeys = onlineMaybeboardCards
      .filter(card => availableNames.has(card.name))
      .map(cardKey);
    const ownedMaybeboardLocations = Object.fromEntries(
      onlineMaybeboardCards
        .filter(card => availableNames.has(card.name))
        .map(card => [
          cardKey(card),
          getCollectionLocations(card.name, bulkNames, coolNames, tradeNames),
        ])
    );

    return NextResponse.json({
      availableProxyKeys,
      availableProxyLocations,
      ownedMaybeboardKeys,
      ownedMaybeboardLocations,
    }, { status: 200 });
  } catch (err) {
    console.error("Error checking available proxies:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
