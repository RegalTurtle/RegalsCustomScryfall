import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authorization from "@/authorization";
import { authOptions } from "@/auth-options";
import gameData from "@/data/games";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ game_id: string }> }
): Promise<NextResponse> {
  const { game_id } = await params;
  const session = await getServerSession({ request, ...authOptions });

  if (!session || !authorization.canAddGames(session.user?.permissionLevel)) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    await gameData.deleteGame(game_id);

    return NextResponse.json({ message: "Game deleted" }, { status: 200 });
  } catch (err) {
    console.error("Error deleting game:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}
