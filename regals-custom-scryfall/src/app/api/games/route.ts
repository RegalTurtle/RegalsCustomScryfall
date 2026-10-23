import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authorization from "@/authorization";
import { authOptions } from "@/auth-options";
import gameData from "@/data/games";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const deckId = request.nextUrl.searchParams.get("deckId") ?? undefined;
    const format = request.nextUrl.searchParams.get("format") ?? undefined;
    const result = request.nextUrl.searchParams.get("result") ?? undefined;
    const dateFrom = request.nextUrl.searchParams.get("dateFrom") ?? undefined;
    const dateTo = request.nextUrl.searchParams.get("dateTo") ?? undefined;
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;

    const games = await gameData.getGames({
      deckId,
      format,
      result: result === "win" || result === "loss" || result === "tie" ? result : undefined,
      dateFrom,
      dateTo,
      limit,
    });

    return NextResponse.json({ games, stats: gameData.getGameStats(games) }, { status: 200 });
  } catch (err) {
    console.error("Error fetching games:", err);
    return NextResponse.json({ error: "Could not fetch games" }, { status: 400 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession({ request, ...authOptions });

  if (!session || !authorization.canAddGames(session.user?.permissionLevel)) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const gameId = await gameData.addGame(body);

    return NextResponse.json({ gameId }, { status: 201 });
  } catch (err) {
    console.error("Error adding game:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}
