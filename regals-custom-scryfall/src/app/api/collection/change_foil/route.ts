import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authorization from "@/authorization";
import { authOptions } from "@/auth-options";
import cardData from "@/data/cards";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession({ request, ...authOptions });

  if (!session || !authorization.canAddCardsToCollection(session.user?.permissionLevel)) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const { collectionType, cardId, quant, foil } = await request.json();
    await cardData.changeCardFoil(collectionType, cardId, quant, foil);

    return NextResponse.json({ message: "Card finish updated" }, { status: 201 });
  } catch (err) {
    console.error("Error updating card finish:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}
