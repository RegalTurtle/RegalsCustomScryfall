import { NextRequest, NextResponse } from "next/server";
import cardData from "@/data/cards"

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();

    await cardData.addCard(body.name, body.quant, body.set, body.cn, body.foil, body.proxy);

    return NextResponse.json({ message: "Card received" }, { status: 201 });
  } catch (err) {
    console.error("Error parsing request:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}