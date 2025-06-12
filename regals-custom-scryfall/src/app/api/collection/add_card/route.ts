import { NextRequest, NextResponse } from "next/server";
import cardData from "@/data/cards"
import { getServerSession } from "next-auth";
import authorization from "@/authorization";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession({ req, ...authOptions });

  if (!session || !authorization.canAddCardsToCollection(session.user?.permissionLevel)) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const body = await req.json();

    await cardData.addCard(body.name, body.quant, body.set, body.cn, body.foil, body.proxy, body.image, body.oracle);

    return NextResponse.json({ message: "Card received" }, { status: 201 });
  } catch (err) {
    console.error("Error parsing request:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}