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
    const { fromCollectionType, toCollectionType, cardId, quant } = await request.json();
    await cardData.transferCard(fromCollectionType, toCollectionType, cardId, quant);

    return NextResponse.json({ message: "Card transferred" }, { status: 201 });
  } catch (err) {
    console.error("Error transferring card:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}
