import { NextRequest, NextResponse } from "next/server";
import { bulkCards, coolCards, tradeBinder } from "@/config/mongoCollections";
import { Card } from "@/types";
import { Collection } from "mongodb";
import { buildCollectionCardSearchQuery } from "@/utils/cardSearch";

export async function GET(
  request: NextRequest,
  { params }: { params: { search_terms: string, collection_type: "bulk" | "cool-cards" | "trade-binder" } }
) {
  // const searchTerms = await (await params).search_terms;
  const { search_terms, collection_type } = await params;
  const mongoQuery = buildCollectionCardSearchQuery(search_terms);
  
  try {
    let cardsCollection: Collection<Card>;
    if (collection_type === "bulk") {
      cardsCollection = await bulkCards();
    } else if (collection_type === "cool-cards") {
      cardsCollection = await coolCards();
    } else if (collection_type === "trade-binder") {
      cardsCollection = await tradeBinder();
    } else {
      return new NextResponse("collection_type invalid", { status: 400 });
    }
    const foundCards = await cardsCollection.find(mongoQuery).sort({ updatedAt: -1 }).limit(100).toArray();
    return NextResponse.json(foundCards);
  } catch (error) {
    console.error("Error fetching cards:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
