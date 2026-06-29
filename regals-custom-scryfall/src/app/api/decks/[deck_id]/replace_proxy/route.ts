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
  const session = await getServerSession({ request, ...authOptions });

  if (!session || !authorization.canAddCardsToCollection(session.user?.permissionLevel)) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const { originalSet, originalCn, collection, collectionCardId, returnCollection, deckSection } = await request.json();
    await deckData.replaceProxyWithOwnedCard(deck_id, originalSet, originalCn, collection, collectionCardId, returnCollection, deckSection);
    return NextResponse.json({ message: "Card replaced" }, { status: 201 });
  } catch (err) {
    console.error("Error replacing card:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}
