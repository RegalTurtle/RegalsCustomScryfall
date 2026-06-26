import cardsData from "@/data/cards";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { collection_type: "bulk" | "cool-cards" | "watchlist" | "trade-binder"; page: string } }
) {
  const { collection_type, page } = params;
  try {
    // Gets a page of cards from only those cards that are in my bulk
    let allCards = await cardsData.getPageOfCards(parseInt(page), collection_type);

    return NextResponse.json(allCards);
  } catch (error) {
    console.error("Error fetching cards:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
