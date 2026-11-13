import { authenticatedUserId } from "@/server/auth";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import cardData from "@/data/cards"

export async function GET(request: NextRequest) {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const count = await cardData.countAllCards(userId);

    return NextResponse.json({ count }, { status: 200 });
  } catch (err) {
    console.error("Error parsing request:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}