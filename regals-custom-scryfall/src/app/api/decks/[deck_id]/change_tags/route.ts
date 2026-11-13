import { authenticatedUserId } from "@/server/auth";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import deckData from "@/data/decks";

function getDeckSection(collectionType?: string): "cards" | "sideboard" | "maybeboard" | "wishlist" {
  const section = collectionType?.split("+")[1];

  if (section === "sideboard" || section === "maybeboard" || section === "wishlist") {
    return section;
  }

  return "cards";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deck_id: string }> }
): Promise<NextResponse> {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { deck_id } = await params;
  try {
    const { set, cn, updatedTags, collectionType } = await request.json();
    await deckData.setTags(userId, deck_id, set, cn, updatedTags, getDeckSection(collectionType));
    return NextResponse.json({ message: "Tags updated" }, { status: 201 });
  } catch (err) {
    console.error("Error parsing request:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
