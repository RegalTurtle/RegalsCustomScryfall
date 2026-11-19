import { authenticatedUserId } from "@/server/auth";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import cardData from "@/data/cards";
import deckData from "@/data/decks";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deck_id: string }> }
): Promise<NextResponse> {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const { deck_id } = await params;
    if (!await deckData.findDeckByMongoId(userId, deck_id)) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }
    const name = request.nextUrl.searchParams.get("name");
    if (!name) return NextResponse.json({ error: "Missing card name" }, { status: 400 });

    const ownedVersions = await cardData.getOwnedVersionsByName(userId, name);
    return NextResponse.json({ ownedVersions }, { status: 200 });
  } catch (err) {
    console.error("Error fetching owned versions:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
