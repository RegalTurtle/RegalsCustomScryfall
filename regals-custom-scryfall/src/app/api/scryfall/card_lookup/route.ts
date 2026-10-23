import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authorization from "@/authorization";
import { authOptions } from "@/auth-options";
import { fetchScryfallJson } from "@/utils/scryfallRateLimit";

const headers = {
  "User-Agent": "RegalTurtlesMagic/1.0",
  "Accept": "application/json",
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function normalizePriceValue(value: unknown): string | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed.toFixed(2) : null;
}

function getCheapestPrintingsPrice(cards: Array<Record<string, any>>): Record<string, string | null> | null {
  const cheapest: Record<string, string | null> = {
    usd: null,
    usd_foil: null,
    usd_etched: null,
    eur: null,
    tix: null,
  };

  for (const card of cards) {
    const prices = card?.prices;
    if (!prices) continue;

    for (const key of Object.keys(cheapest) as Array<keyof typeof cheapest>) {
      const candidate = normalizePriceValue(prices[key]);
      if (!candidate) continue;

      if (!cheapest[key] || Number(candidate) < Number(cheapest[key])) {
        cheapest[key] = candidate;
      }
    }
  }

  return Object.values(cheapest).some(value => value !== null) ? cheapest : null;
}

async function fetchJson(url: string) {
  const retryDelays = [0, 750, 1500];
  let lastRes: Response | null = null;
  let lastData: any = null;

  for (let attempt = 0; attempt < retryDelays.length; attempt++) {
    if (retryDelays[attempt] > 0) {
      await wait(retryDelays[attempt]);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const { res, data } = await fetchScryfallJson(url, { headers, signal: controller.signal });
      lastRes = res;
      lastData = data;

      if (res.status === 429) {
        throw new Error("Scryfall rate limit exceeded. Please wait 30 seconds and try again.");
      }

      if (res.ok || ![404, 500, 502, 503, 504].includes(res.status)) {
        return { res, data };
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("rate limit exceeded")) {
        throw error;
      }

      if (attempt === retryDelays.length - 1) {
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return { res: lastRes as Response, data: lastData };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession({ request, ...authOptions });

  if (!session || !authorization.canAddCardsToCollection(session.user?.permissionLevel)) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const { name, set, cn, scryfallId } = await request.json();
    const fetchCheapestPrice = async (cardName: string | null | undefined) => {
      if (!cardName) return null;

      const params = new URLSearchParams({
        q: `!"${cardName}"`,
        unique: "prints",
      });

      const { res, data } = await fetchJson(`https://api.scryfall.com/cards/search?${params.toString()}`);
      if (!res.ok || data.object === "error" || !Array.isArray(data.data)) {
        return null;
      }

      return getCheapestPrintingsPrice(data.data);
    };

    if (scryfallId) {
      const { res, data } = await fetchJson(`https://api.scryfall.com/cards/${scryfallId}`);
      if (res.ok && data.object !== "error") {
        const cheapestPrice = await fetchCheapestPrice(data.name);
        return NextResponse.json({ card: data, cheapestPrice }, { status: 200 });
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
        const cheapestPrice = await fetchCheapestPrice(card.name ?? cardName);
        return NextResponse.json({ card, cheapestPrice }, { status: 200 });
      }

      const fallbackCard = await fetchByNameAndSet();
      if (fallbackCard) {
        const cheapestPrice = await fetchCheapestPrice(fallbackCard.name ?? cardName);
        return NextResponse.json({ card: fallbackCard, cheapestPrice }, { status: 200 });
      }
    } else {
      const { res, data } = await fetchJson(`https://api.scryfall.com/cards/${setCode}/${encodeURIComponent(collectorNumber)}`);
      if (res.ok && data.object !== "error") {
        const cheapestPrice = await fetchCheapestPrice(data.name ?? cardName);
        return NextResponse.json({ card: data, cheapestPrice }, { status: 200 });
      }

      const fallbackCard = await fetchByNameAndSet();
      if (fallbackCard) {
        const cheapestPrice = await fetchCheapestPrice(fallbackCard.name ?? cardName);
        return NextResponse.json({ card: fallbackCard, cheapestPrice }, { status: 200 });
      }
    }

    return NextResponse.json({ error: `${cardName || `${setCode.toUpperCase()} ${collectorNumber}`} was not found on Scryfall` }, { status: 404 });
  } catch (err) {
    console.error("Error looking up Scryfall card:", err);

    if (err instanceof Error && err.message.includes("rate limit exceeded")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }

    return NextResponse.json({ error: "Scryfall lookup failed" }, { status: 400 });
  }
}
