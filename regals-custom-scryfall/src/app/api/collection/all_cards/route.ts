import { NextResponse } from "next/server";
import cardsData from "@/data/cards";
import { Card } from "@/types";

type ExtendedCard = Card & {
  image: string;
};

export async function GET() {
  try {
    let allCards = await cardsData.getAllCards(1);

    let allCardsPlus: Array<ExtendedCard> = [];

    for (const card of allCards) {
      const sleep = (ms: number): Promise<undefined> => new Promise((resolve) => setTimeout(resolve, ms));

      if (card.image) {
        allCardsPlus.push(card as ExtendedCard);
      } else {
        const headers = {
          "User-Agent": "RegalTurtlesMagic/1.0", // Replace with your app name/version
          "Accept": "application/json",
        };

        const res: Response = await fetch(`https://api.scryfall.com/cards/${card.set}/${card.cn}/`, { headers });
        const data = await res.json();
        let newCard: ExtendedCard = card as ExtendedCard;

        newCard.image = data.image_uris ? data.image_uris.normal : data.card_faces[0].image_uris.normal;

        allCardsPlus.push(newCard);

        await sleep(75);
      }
    }

    return NextResponse.json(allCards);
  } catch (error) {
    console.error("Error fetching cards:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}