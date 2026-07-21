import { NextRequest, NextResponse } from "next/server";
import cardData from "@/data/cards"
import { getServerSession } from "next-auth";
import authorization from "@/authorization";
import { authOptions } from "@/auth-options";
import validation from "@/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collection_type: string }> }
): Promise<NextResponse> {
  const { collection_type: rawCollectionType } = await params;
  const session = await getServerSession({ request, ...authOptions });

  if (!session || !authorization.canAddCardsToCollection(session.user?.permissionLevel)) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const collection_type = validation.verifyCollectionType(rawCollectionType);
    const body = await request.json();
    
    await cardData.addCard(collection_type, body.name, body.quant, body.set, body.cn, body.foil, body.proxy, body.image, body.oracle, body.color, body.color_identity, body.type, body.cmc, body.tag);

    return NextResponse.json({ message: "Card received" }, { status: 201 });
  } catch (err) {
    console.error("Error parsing request:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
