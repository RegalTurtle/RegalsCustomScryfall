import { NextRequest, NextResponse } from "next/server";
import cardData from "@/data/cards"

export async function GET(req: NextRequest) {
  try {
    const count = await cardData.countAllCards();

    return NextResponse.json({ count }, { status: 200 });
  } catch (err) {
    console.error("Error parsing request:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}