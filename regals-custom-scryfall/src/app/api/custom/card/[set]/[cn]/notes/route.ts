import { NextRequest, NextResponse } from "next/server";
import { authenticatedUserId } from "@/server/auth";
import { customCards } from "@/config/customCardCollections";
import { users } from "@/config/mongoCollections";
import validation from "@/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ set: string; cn: string }> },
) {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
  const account = await (await users()).findOne({ _id: userId }, { projection: { username: 1 } });
  if (!account?.username) return NextResponse.json({ error: "You must be signed in" }, { status: 401 });

  const { set, cn } = await params;
  const body = await request.json();
  const note = validation.verifyStr(body.note, "note");
  if (note.length > 1000) return NextResponse.json({ error: "Note is too long" }, { status: 400 });

  const collection = await customCards();
  const date = new Date();
  const formattedDate = `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
  const result = await collection.updateOne(
    { set: set.toUpperCase(), cn: Number(cn) },
    { $push: { notes: { date: formattedDate, creatorId: userId, creator: account.username, notes: note } } },
  );

  if (!result.matchedCount) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
