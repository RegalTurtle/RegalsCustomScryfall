import { NextResponse } from "next/server";
import { getCustomCard } from "@/data/customCards";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ set: string; cn: string }> },
) {
  const { set, cn } = await params;
  const card = await getCustomCard(set, Number(cn));
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  return NextResponse.json({ card });
}
