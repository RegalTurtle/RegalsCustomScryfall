import { authenticatedUserId } from "@/server/auth";
import { NextResponse } from "next/server";
import gameData from "@/data/games";

export async function GET(): Promise<NextResponse> {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const deckStats = await gameData.getDeckOverviewStats(userId);
    return NextResponse.json({ deckStats }, { status: 200 });
  } catch (error) {
    console.error("Error fetching deck game overview:", error);
    return NextResponse.json({ error: "Could not fetch deck game overview" }, { status: 400 });
  }
}
