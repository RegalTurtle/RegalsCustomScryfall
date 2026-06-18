import { NextRequest, NextResponse } from "next/server";
import { bulkCards, coolCards, tradeBinder } from "@/config/mongoCollections";
import deckData from "@/data/decks";
import { Card } from "@/types";

const cardKey = (card: Card) => `${card.set}|${card.cn}`;

type ScryfallPrices = {
  usd?: string | null;
  usd_foil?: string | null;
  usd_etched?: string | null;
};

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

function getProxyPrice(card: Card, prices: ScryfallPrices | undefined): number {
  if (!prices) return 0;

  const rawPrice = card.foil === "foil"
    ? prices.usd_foil ?? prices.usd
    : card.foil === "etched"
      ? prices.usd_etched ?? prices.usd_foil ?? prices.usd
      : prices.usd;
  const price = Number(rawPrice);

  return Number.isFinite(price) ? price * card.quant : 0;
}

async function fetchProxyPrices(proxyCards: Card[]): Promise<Record<string, ScryfallPrices>> {
  const uniqueProxyCards = Array.from(
    new Map(proxyCards.map(card => [cardKey(card), card])).values()
  );
  const priceEntries = await Promise.all(
    uniqueProxyCards.map(async card => {
      try {
        const res = await fetch(`https://api.scryfall.com/cards/${card.set.toLowerCase()}/${encodeURIComponent(card.cn)}`, {
          headers: {
            "User-Agent": "RegalTurtlesMagic/1.0",
            "Accept": "application/json",
          },
        });

        if (!res.ok) return [cardKey(card), undefined] as const;
        const data: { prices?: ScryfallPrices } = await res.json();

        return [cardKey(card), data.prices] as const;
      } catch {
        return [cardKey(card), undefined] as const;
      }
    })
  );

  return Object.fromEntries(priceEntries.filter((entry): entry is [string, ScryfallPrices] => Boolean(entry[1])));
}

export async function GET(
  request: NextRequest,
  { params }: { params: { deck_id: string } }
): Promise<NextResponse> {
  const { deck_id } = await params;

  try {
    const includeDeckCards = request.nextUrl.searchParams.get("includeDeckCards") === "true";
    const deck = await deckData.findDeckByMongoId(deck_id);
    if (!deck) return NextResponse.json({ error: "Deck not found" }, { status: 404 });

    const deckCards = deck.cards ?? [];
    const proxyCards = deck.cards.filter(card => card.proxy);
    const proxyPrices = await fetchProxyPrices(proxyCards);
    const proxyUsdTotal = proxyCards.reduce((total, card) => total + getProxyPrice(card, proxyPrices[cardKey(card)]), 0);
    const onlineMaybeboardCards = deck.wishlist ?? [];
    const deckCardNames = includeDeckCards ? Array.from(new Set(deckCards.map(card => card.name))) : [];
    const proxyNames = Array.from(new Set(proxyCards.map(card => card.name)));
    const onlineMaybeboardNames = Array.from(new Set(onlineMaybeboardCards.map(card => card.name)));
    const cardNamesToCheck = Array.from(new Set([
      ...deckCardNames,
      ...proxyNames,
      ...onlineMaybeboardNames,
    ]));

    if (cardNamesToCheck.length === 0) {
      return NextResponse.json({
        availableProxyKeys: [],
        availableProxyLocations: {},
        ownedMaybeboardKeys: [],
        ownedMaybeboardLocations: {},
        ownedDeckCardKeys: [],
        ownedDeckCardLocations: {},
        proxyUsdTotal: 0,
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
    const ownedDeckCardKeys = includeDeckCards
      ? deckCards
        .filter(card => availableNames.has(card.name))
        .map(cardKey)
      : [];
    const ownedDeckCardLocations = includeDeckCards
      ? Object.fromEntries(
        deckCards
          .filter(card => availableNames.has(card.name))
          .map(card => [
            cardKey(card),
            getCollectionLocations(card.name, bulkNames, coolNames, tradeNames),
          ])
      )
      : {};

    return NextResponse.json({
      availableProxyKeys,
      availableProxyLocations,
      ownedMaybeboardKeys,
      ownedMaybeboardLocations,
      ownedDeckCardKeys,
      ownedDeckCardLocations,
      proxyUsdTotal,
    }, { status: 200 });
  } catch (err) {
    console.error("Error checking available proxies:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
