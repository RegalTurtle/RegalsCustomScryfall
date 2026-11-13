import { authenticatedUserId } from "@/server/auth";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import cardData from "@/data/cards"
import validation from "@/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collection_type: string }> }
): Promise<NextResponse> {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { collection_type: rawCollectionType } = await params;
  try {
    const collection_type = validation.verifyCollectionType(rawCollectionType);
    const body = await request.json();
    
    await cardData.addCard(userId, collection_type, body.name, body.quant, body.set, body.cn, body.foil, body.proxy, body.image, body.oracle, body.color, body.color_identity, body.type, body.cmc, body.tag);

    return NextResponse.json({ message: "Card received" }, { status: 201 });
  } catch (err) {
    console.error("Error parsing request:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
