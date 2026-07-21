import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { unlink } from "fs/promises";
import path from "path";
import authorization from "@/authorization";
import { authOptions } from "@/auth-options";
import deckData from "@/data/decks";

async function deleteLocalProxyImage(imageUrl: string | undefined) {
  if (!imageUrl || !imageUrl.startsWith("/proxy-images/")) return;

  const fileName = imageUrl.slice("/proxy-images/".length);
  if (!fileName || path.basename(fileName) !== fileName) return;

  try {
    await unlink(path.join(process.cwd(), "public", "proxy-images", fileName));
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      console.warn(`Could not delete old proxy image ${imageUrl}:`, error);
    }
  }
}

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
    const replacedImage = await deckData.replaceProxyWithOwnedCard(deck_id, originalSet, originalCn, collection, collectionCardId, returnCollection, deckSection);
    await deleteLocalProxyImage(replacedImage);
    return NextResponse.json({ message: "Card replaced" }, { status: 201 });
  } catch (err) {
    console.error("Error replacing card:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}
