import { authenticatedUserId } from "@/server/auth";
export const dynamic = "force-dynamic";
import cardsData from "@/data/cards";
import { NextRequest, NextResponse } from "next/server";

type CardCollectionType = "bulk" | "cool-cards" | "watchlist" | "trade-binder";

function isCardCollectionType(collectionType: string): collectionType is CardCollectionType {
  return ["bulk", "cool-cards", "watchlist", "trade-binder"].includes(collectionType);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection_type: string }> }
) {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { collection_type } = await params;
  try {
    if (!isCardCollectionType(collection_type)) {
      return new NextResponse("collection_type invalid", { status: 400 });
    }

    const allCards = collection_type === "watchlist"
      ? await cardsData.getAllCards(userId, collection_type)
      : await cardsData.getPageOfCards(userId, 1, collection_type);

    return NextResponse.json(allCards);
  } catch (error) {
    console.error("Error fetching cards:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
