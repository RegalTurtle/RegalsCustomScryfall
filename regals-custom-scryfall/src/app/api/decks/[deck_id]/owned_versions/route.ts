import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authorization from "@/authorization";
import { authOptions } from "@/auth-options";
import cardData from "@/data/cards";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deck_id: string }> }
): Promise<NextResponse> {
  const session = await getServerSession({ request, ...authOptions });

  if (!session || !authorization.canAddCardsToCollection(session.user?.permissionLevel)) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const name = request.nextUrl.searchParams.get("name");
    if (!name) return NextResponse.json({ error: "Missing card name" }, { status: 400 });

    const ownedVersions = await cardData.getOwnedVersionsByName(name);
    return NextResponse.json({ ownedVersions }, { status: 200 });
  } catch (err) {
    console.error("Error fetching owned versions:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
