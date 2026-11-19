import { authenticatedUserId } from "@/server/auth";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import deckData from "@/data/decks";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deck_id: string }> }
): Promise<NextResponse> {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { deck_id } = await params;
  try {
    const { cardOut, cardIn } = await request.json();
    await deckData.addPlannedChange(userId, deck_id, cardOut, cardIn);
    return NextResponse.json({ message: "Planned change added" }, { status: 201 });
  } catch (err) {
    console.error("Error adding planned change:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ deck_id: string }> }
): Promise<NextResponse> {
  const { deck_id } = await params;
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const { action, changeIndex, targetSection } = await request.json();
    if (action !== "apply") {
      return NextResponse.json({ error: "Unsupported planned change action" }, { status: 400 });
    }

    await deckData.applyPlannedChange(userId, deck_id, changeIndex, targetSection ?? "maybeboard");
    return NextResponse.json({ message: "Planned change applied" }, { status: 200 });
  } catch (err) {
    console.error("Error applying planned change:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deck_id: string }> }
): Promise<NextResponse> {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { deck_id } = await params;
  try {
    const { changeIndex } = await request.json();
    await deckData.removePlannedChange(userId, deck_id, changeIndex);
    return NextResponse.json({ message: "Planned change removed" }, { status: 200 });
  } catch (err) {
    console.error("Error removing planned change:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}
