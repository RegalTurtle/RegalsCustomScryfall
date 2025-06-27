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
    const { set, cn, updatedTags } = await request.json();
    console.log("before setTags")
    await deckData.setTags(deck_id, set, cn, updatedTags);
    console.log("after setTags")
    return NextResponse.json({ message: "Tags updated" }, { status: 201 });
  } catch (err) {
    console.error("Error parsing request:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}