import { authenticatedUserId } from "@/server/auth";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import cardData from "@/data/cards";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const { collectionType, cardId, quant } = await request.json();
    await cardData.removeCard(userId, collectionType, cardId, quant);

    return NextResponse.json({ message: "Card removed" }, { status: 201 });
  } catch (err) {
    console.error("Error removing card:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }
}
