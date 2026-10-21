import { NextResponse } from "next/server";
import gameData from "@/data/games";

export async function GET(): Promise<NextResponse> {
  try {
    const deckStats = await gameData.getDeckOverviewStats();
    return NextResponse.json({ deckStats }, { status: 200 });
  } catch (error) {
    console.error("Error fetching deck game overview:", error);
    return NextResponse.json({ error: "Could not fetch deck game overview" }, { status: 400 });
  }
}
