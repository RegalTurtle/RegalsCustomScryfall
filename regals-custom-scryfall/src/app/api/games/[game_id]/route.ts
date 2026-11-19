import { authenticatedUserId } from "@/server/auth";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import gameData from "@/data/games";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ game_id: string }> }
): Promise<NextResponse> {
  const { game_id } = await params;
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const body = await request.json();
    await gameData.updateGame(userId, game_id, body);

    return NextResponse.json({ message: "Game updated" }, { status: 200 });
  } catch (err) {
    console.error("Error updating game:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ game_id: string }> }
): Promise<NextResponse> {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { game_id } = await params;
  try {
    await gameData.deleteGame(userId, game_id);

    return NextResponse.json({ message: "Game deleted" }, { status: 200 });
  } catch (err) {
    console.error("Error deleting game:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}
