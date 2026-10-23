import cardsData from "@/data/cards";
import { NextRequest, NextResponse } from "next/server";

type CardCollectionType = "bulk" | "cool-cards" | "watchlist" | "trade-binder";

function isCardCollectionType(collectionType: string): collectionType is CardCollectionType {
  return ["bulk", "cool-cards", "watchlist", "trade-binder"].includes(collectionType);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection_type: string; page: string }> }
) {
  const { collection_type, page } = await params;
  try {
    if (!isCardCollectionType(collection_type)) {
      return new NextResponse("collection_type invalid", { status: 400 });
    }

    // Gets a page of cards from only those cards that are in my bulk
    let allCards = await cardsData.getPageOfCards(parseInt(page), collection_type);

    return NextResponse.json(allCards);
  } catch (error) {
    console.error("Error fetching cards:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
