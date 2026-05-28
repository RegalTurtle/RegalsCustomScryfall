import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authorization from "@/authorization";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const headers = {
  "User-Agent": "RegalTurtlesMagic/1.0",
  "Accept": "application/json",
};

async function fetchJson(url: string) {
  const res = await fetch(url, { headers });
  const data = await res.json();

  return { res, data };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession({ request, ...authOptions });

  if (!session || !authorization.canAddCardsToCollection(session.user?.permissionLevel)) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const { name, set, cn, scryfallId } = await request.json();
    if (scryfallId) {
      const { res, data } = await fetchJson(`https://api.scryfall.com/cards/${scryfallId}`);
      if (res.ok && data.object !== "error") {
        return NextResponse.json({ card: data }, { status: 200 });
      }
    }

    if (!set || !cn) {
      return NextResponse.json({ error: "Missing card lookup fields" }, { status: 400 });
    }

    const setCode = String(set).toLowerCase();
    const collectorNumber = String(cn);
    const cardName = name ? String(name) : "";

    const fetchByNameAndSet = async () => {
      const params = new URLSearchParams({
        q: cardName ? `!"${cardName}" s:${setCode}` : `s:${setCode} cn:"${collectorNumber}"`,
        unique: "prints",
      });
      const { res, data } = await fetchJson(`https://api.scryfall.com/cards/search?${params.toString()}`);

      if (!res.ok || data.object === "error" || !data.data?.[0]) {
        return null;
      }

      return data.data.find((card: { name: string; collector_number: string }) => (
        (!cardName || card.name === cardName) && card.collector_number === collectorNumber
      )) ?? data.data.find((card: { name: string }) => card.name === cardName) ?? data.data[0];
    };

    if (setCode === "plst") {
      const params = new URLSearchParams({ q: `s:plst cn:"${collectorNumber}"` });
      const { res, data } = await fetchJson(`https://api.scryfall.com/cards/search?${params.toString()}`);
      if (res.ok && data.object !== "error" && data.data?.[0]) {
        const card = data.data.find((card: { name: string }) => card.name === cardName) ?? data.data[0];
        return NextResponse.json({ card }, { status: 200 });
      }

      const fallbackCard = await fetchByNameAndSet();
      if (fallbackCard) return NextResponse.json({ card: fallbackCard }, { status: 200 });
    } else {
      const { res, data } = await fetchJson(`https://api.scryfall.com/cards/${setCode}/${encodeURIComponent(collectorNumber)}`);
      if (res.ok && data.object !== "error") {
        return NextResponse.json({ card: data }, { status: 200 });
      }

      const fallbackCard = await fetchByNameAndSet();
      if (fallbackCard) return NextResponse.json({ card: fallbackCard }, { status: 200 });
    }

    return NextResponse.json({ error: `${cardName || `${setCode.toUpperCase()} ${collectorNumber}`} was not found on Scryfall` }, { status: 404 });
  } catch (err) {
    console.error("Error looking up Scryfall card:", err);
    return NextResponse.json({ error: "Scryfall lookup failed" }, { status: 400 });
  }
}
