import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authorization from "@/authorization";
import { authOptions } from "@/auth-options";
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
  const { deck_id } = await params;
  const session = await getServerSession({ request, ...authOptions });

  if (!session || !authorization.canAddDecks(session.user?.permissionLevel)) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const { set, cn, updatedTags, collectionType } = await request.json();
    await deckData.setTags(deck_id, set, cn, updatedTags, getDeckSection(collectionType));
    return NextResponse.json({ message: "Tags updated" }, { status: 201 });
  } catch (err) {
    console.error("Error parsing request:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
