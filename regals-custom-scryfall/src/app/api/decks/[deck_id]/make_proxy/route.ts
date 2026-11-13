import { authenticatedUserId } from "@/server/auth";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authorization from "@/authorization";
import { authOptions } from "@/auth-options";
import deckData from "@/data/decks";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deck_id: string }> }
): Promise<NextResponse> {
  const { deck_id } = await params;
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const { deckSection, set, cn, foil } = await request.json();
    await deckData.makeCardProxy(userId, deck_id, deckSection, set, cn, foil);
    return NextResponse.json({ message: "Card made proxy" }, { status: 201 });
  } catch (err) {
    console.error("Error making card proxy:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}
