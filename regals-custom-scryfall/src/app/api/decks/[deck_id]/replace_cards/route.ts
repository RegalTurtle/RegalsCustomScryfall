import { authenticatedUserId } from "@/server/auth";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import deckData from "@/data/decks";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deck_id: string }> }
): Promise<NextResponse> {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { deck_id } = await params;
  try {
    const { cards } = await request.json();
    await deckData.replaceCards(userId, deck_id, cards);
    return NextResponse.json({ message: "Deck cards replaced" }, { status: 201 });
  } catch (err) {
    console.error("Error replacing deck cards:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
