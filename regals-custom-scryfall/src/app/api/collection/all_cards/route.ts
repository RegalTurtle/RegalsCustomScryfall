import { NextResponse } from "next/server";
import cardsData from "@/data/cards";

export async function GET() {
  try {
    let allCards = await cardsData.getAllCards(1);

    return NextResponse.json(allCards);
  } catch (error) {
    console.error("Error fetching cards:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}