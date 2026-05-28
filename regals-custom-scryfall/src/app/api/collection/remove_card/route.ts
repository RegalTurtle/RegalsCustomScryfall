import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authorization from "@/authorization";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import cardData from "@/data/cards";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession({ request, ...authOptions });

  if (!session || !authorization.canAddCardsToCollection(session.user?.permissionLevel)) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const { collectionType, cardId, quant } = await request.json();
    await cardData.removeCard(collectionType, cardId, quant);

    return NextResponse.json({ message: "Card removed" }, { status: 201 });
  } catch (err) {
    console.error("Error removing card:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}
