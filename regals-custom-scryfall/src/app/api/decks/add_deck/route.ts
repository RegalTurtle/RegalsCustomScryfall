import { authenticatedUserId } from "@/server/auth";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import deckData from "@/data/decks";

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const body = await request.json();

    const objId = await deckData.addDeck(
      userId,
      body.name,
      body.link || null,
      body.owner,
      body.format,
      body.colorId || null,
      Boolean(body.mainForColorIdentity),
      body.together !== false,
    );

    return NextResponse.json({ message: "Deck received", objId }, { status: 201 });
  } catch (err) {
    console.error("Error parsing request:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
