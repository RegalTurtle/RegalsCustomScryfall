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
    const body = await request.json();
    await deckData.updateDeckSettings(
      userId,
      deck_id,
      body.name,
      body.link || null,
      body.owner,
      body.format,
      body.colorId || null,
      Boolean(body.mainForColorIdentity),
      body.notes ?? "",
      body.together !== false,
    );

    return NextResponse.json({ message: "Deck settings updated" }, { status: 200 });
  } catch (err) {
    console.error("Error updating deck settings:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
