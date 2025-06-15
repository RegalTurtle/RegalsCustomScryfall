import { NextResponse } from "next/server";
import cardsData from "@/data/cards";

export async function GET() {
  try {
    // Gets a page of cards from only those cards that are in my bulk
    let allCards = await cardsData.getPageOfCardsBulk(1);

    return NextResponse.json(allCards);
  } catch (error) {
    console.error("Error fetching cards:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}