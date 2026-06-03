import { NextRequest, NextResponse } from "next/server";
import { decks } from "@/config/mongoCollections";
import { Card, Deck } from "@/types";

type DeckSection = "cards" | "sideboard" | "maybeboard" | "wishlist";

const sectionLabels: Record<DeckSection, string> = {
  cards: "Decklist",
  sideboard: "Sideboard",
  maybeboard: "Maybeboard",
  wishlist: "Wishlist",
};

function cardVersionLabel(card: Card): string {
  const finish = card.foil === "nonfoil" ? "Nonfoil" : card.foil === "foil" ? "Foil" : "Etched foil";
  return `${card.set.toUpperCase()} ${card.cn} - ${finish}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const name = request.nextUrl.searchParams.get("name")?.trim();

    if (!name) {
      return NextResponse.json({ error: "Card name is required" }, { status: 400 });
    }

    const decksCollection = await decks();
    const allDecks = await decksCollection
      .find({
        $or: [
          { "cards.name": name },
          { "sideboard.name": name },
          { "maybeboard.name": name },
          { "wishlist.name": name },
        ],
      })
      .sort({ name: 1 })
      .toArray();

    const usages = (allDecks as Deck[]).flatMap(deck => {
      const deckId = deck._id?.toString() ?? "";
      const sections: Array<{ key: DeckSection; cards: Card[] }> = [
        { key: "cards", cards: deck.cards ?? [] },
        { key: "sideboard", cards: deck.sideboard ?? [] },
        { key: "maybeboard", cards: deck.maybeboard ?? [] },
        { key: "wishlist", cards: deck.wishlist ?? [] },
      ];

      return sections.flatMap(section =>
        section.cards
          .filter(card => card.name === name)
          .map(card => ({
            deckId,
            deckName: deck.name,
            section: section.key,
            sectionLabel: sectionLabels[section.key],
            quantity: card.quant,
            proxy: card.proxy,
            set: card.set,
            cn: card.cn,
            foil: card.foil,
            versionLabel: cardVersionLabel(card),
          }))
      );
    });

    return NextResponse.json({ usages }, { status: 200 });
  } catch (err) {
    console.error("Error fetching card deck usage:", err);
    return NextResponse.json({ error: "Card deck usage failed" }, { status: 500 });
  }
}
