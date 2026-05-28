import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authorization from "@/authorization";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import deckData from "@/data/decks";

export async function POST(
  request: NextRequest,
  { params }: { params: { deck_id: string } }
): Promise<NextResponse> {
  const { deck_id } = await params;
  const session = await getServerSession({ request, ...authOptions });

  if (!session || !authorization.canAddDecks(session.user?.permissionLevel)) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const body = await request.json();
    await deckData.updateDeckSettings(
      deck_id,
      body.name,
      body.link || null,
      body.owner,
      body.format,
      body.colorId || null,
    );

    return NextResponse.json({ message: "Deck settings updated" }, { status: 200 });
  } catch (err) {
    console.error("Error updating deck settings:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
