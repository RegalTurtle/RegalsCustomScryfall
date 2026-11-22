import { authenticatedUserId } from "@/server/auth";
import { NextResponse } from "next/server";
import { fetchScryfallJson } from "@/utils/scryfallRateLimit";

export async function GET() {
  if (!await authenticatedUserId()) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const { res, data } = await fetchScryfallJson("https://api.scryfall.com/sets", {
      headers: { "User-Agent": "RegalTurtlesMagic/1.0", Accept: "application/json" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok || !data || typeof data !== "object" || !("data" in data) || !Array.isArray(data.data)) throw new Error("Failed to load set dates");
    const dates: Record<string, string> = {};
    for (const set of data.data) {
      if (!set || typeof set !== "object") continue;
      if (typeof set.code === "string" && typeof set.released_at === "string") dates[set.code.toUpperCase()] = set.released_at;
    }
    return NextResponse.json({ dates });
  } catch {
    return NextResponse.json({ error: "Set dates unavailable" }, { status: 502 });
  }
}
