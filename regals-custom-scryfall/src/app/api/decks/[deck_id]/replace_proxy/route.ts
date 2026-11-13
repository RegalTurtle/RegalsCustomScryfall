import { authenticatedUserId } from "@/server/auth";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import deckData from "@/data/decks";
import { deleteLocalProxyImage } from "@/utils/proxyImages";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deck_id: string }> }
): Promise<NextResponse> {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { deck_id } = await params;
  try {
    const {
      originalSet,
      originalCn,
      collection,
      collectionCardId,
      returnCollection,
      deckSection,
      replacementSet,
      replacementCn,
      replacementFoil,
      replacementImage,
    } = await request.json();

    let replacedImage: string;

    if (replacementSet && replacementCn) {
      replacedImage = await deckData.replaceCardVersion(
        userId,
        deck_id,
        originalSet,
        originalCn,
        replacementSet,
        replacementCn,
        replacementFoil,
        deckSection,
        replacementImage,
      );
    } else {
      replacedImage = await deckData.replaceProxyWithOwnedCard(
        userId,
        deck_id,
        originalSet,
        originalCn,
        collection,
        collectionCardId,
        returnCollection,
        deckSection,
      );
    }

    await deleteLocalProxyImage(replacedImage);
    return NextResponse.json({ message: "Card replaced" }, { status: 201 });
  } catch (err) {
    console.error("Error replacing card:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}
