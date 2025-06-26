import { NextRequest, NextResponse } from "next/server";
import deckData from "@/data/decks";

export async function GET(): Promise<NextResponse> {
  try {
    const allDecks = await deckData.getAllDecks();

    if (!allDecks) return NextResponse.json({ error: `No decks found` }, { status: 400 });

    return NextResponse.json({ allDecks }, { status: 200 });
  } catch (err) {
    console.error("Error parsing request:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}