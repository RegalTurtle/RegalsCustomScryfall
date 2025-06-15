import { NextRequest, NextResponse } from "next/server";
import cardData from "@/data/cards"
import { getServerSession } from "next-auth";
import authorization from "@/authorization";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { CollectionTypeOption } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: { collection_type: CollectionTypeOption } }
): Promise<NextResponse> {
  const { collection_type } = await params;
  const session = await getServerSession({ request, ...authOptions });

  if (!session || !authorization.canAddCardsToCollection(session.user?.permissionLevel)) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const body = await request.json();

    await cardData.addCard(collection_type, body.name, body.quant, body.set, body.cn, body.foil, body.proxy, body.image, body.oracle);

    return NextResponse.json({ message: "Card received" }, { status: 201 });
  } catch (err) {
    console.error("Error parsing request:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}