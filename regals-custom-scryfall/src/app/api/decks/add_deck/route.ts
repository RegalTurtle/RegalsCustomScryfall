import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authorization from "@/authorization";
import { authOptions } from "@/auth-options";
import deckData from "@/data/decks";

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const session = await getServerSession({ request, ...authOptions });

  if (!session || !authorization.canAddDecks(session.user?.permissionLevel)) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const objId = await deckData.addDeck(
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
