import { NextRequest, NextResponse } from "next/server";
import { cards } from "@/config/mongoCollections";

interface ScryfallCard {
  name: string;
  finishes: Array<String>;
  oracle_id: string;
  set: string;
  collector_number: string;
  [key: string]: any; // allows additional properties
}

const headers = {
  "User-Agent": "RegalTurtlesMagic/1.0", // Replace with your app name/version
  "Accept": "application/json",
};

async function fetchAllScryfallResults(searchUrl: string): Promise<ScryfallCard[]> {
  let results: ScryfallCard[] = [];
  let url: string | null = searchUrl;

  while (url) {
    const res: Response = await fetch(url, { headers });
    const data = await res.json();

    if (data.object === "error") {
      return [];
    }

    results = results.concat(data.data);
    url = data.has_more ? data.next_page : null;
  }

  return results;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { search_terms: string } }
) {
  const searchTerms = await (await params).search_terms;

  try {
    const searchUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchTerms)}&unique=prints`;
    const scryfallCards = await fetchAllScryfallResults(searchUrl);

    if (scryfallCards.length === 0) return NextResponse.json([]);

    const matchConditions = scryfallCards.map(({ set, collector_number }: { set: string, collector_number: string }) => ({ set, cn: collector_number }));

    const cardCollection = await cards();
    const matchedCards = await cardCollection.find({
      $or: matchConditions
    }).sort({ updatedAt: -1 }).toArray();

    const imageMap = new Map(
      scryfallCards.map((card: ScryfallCard) => {
        const key = `${card.set}-${card.collector_number}`;
        const image = card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null;
        return [key, image];
      })
    );
    
    const mergedCards = matchedCards
      .filter(card => imageMap.has(`${card.set}-${card.cn}`))
      .map(card => ({
        ...card,
        image: imageMap.get(`${card.set}-${card.cn}`),
      }));

    return NextResponse.json(mergedCards);
  } catch (error) {
    console.error("Error fetching cards:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}