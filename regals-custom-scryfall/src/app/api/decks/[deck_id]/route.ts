import { NextRequest, NextResponse } from "next/server";
import deckData from "@/data/decks";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deck_id: string }> }
): Promise<NextResponse> {
  const { deck_id } = await params;

  try {
    const foundDeck = await deckData.findDeckByMongoId(deck_id);

    if (!foundDeck) return NextResponse.json({ error: `No deck found` }, { status: 400 });

    return NextResponse.json({ foundDeck }, { status: 200 });
  } catch (err) {
    console.error("Error parsing request:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
