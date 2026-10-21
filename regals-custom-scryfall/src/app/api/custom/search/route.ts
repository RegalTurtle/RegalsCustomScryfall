import { NextRequest, NextResponse } from "next/server";
import { searchCustomCards } from "@/data/customCards";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q") ?? "";
    if (!query.trim()) return NextResponse.json({ cards: [] });
    return NextResponse.json({ cards: await searchCustomCards({ query }) });
  } catch (error) {
    console.error("Custom card search failed", error);
    return NextResponse.json({ error: "Custom card search failed" }, { status: 500 });
  }
}
