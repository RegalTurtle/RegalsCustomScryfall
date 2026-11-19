import { authenticatedUserId } from "@/server/auth";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import deckData from "@/data/decks";

type DeckSection = "cards" | "sideboard" | "maybeboard" | "wishlist";

function isDeckSection(section: string): section is DeckSection {
  return section === "cards" || section === "sideboard" || section === "maybeboard" || section === "wishlist";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deck_id: string }> }
): Promise<NextResponse> {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { deck_id } = await params;
  try {
    const { sourceSection, targetSection, set, cn, foil, proxy, quant } = await request.json();

    if (!isDeckSection(sourceSection) || !isDeckSection(targetSection)) {
      return NextResponse.json({ error: "Invalid deck section" }, { status: 400 });
    }

    await deckData.moveCardCopies(userId, deck_id, sourceSection, targetSection, set, cn, foil, proxy, quant);

    return NextResponse.json({ message: "Card moved" }, { status: 201 });
  } catch (err) {
    console.error("Error moving card:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}
