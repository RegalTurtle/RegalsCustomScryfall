import { authenticatedUserId } from "@/server/auth";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import deckData from "@/data/decks";

export async function GET(): Promise<NextResponse> {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const allDecks = await deckData.getDeckOverviews(userId);

    if (!allDecks) return NextResponse.json({ error: `No decks found` }, { status: 400 });

    return NextResponse.json({ allDecks }, { status: 200 });
  } catch (err) {
    console.error("Error parsing request:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
