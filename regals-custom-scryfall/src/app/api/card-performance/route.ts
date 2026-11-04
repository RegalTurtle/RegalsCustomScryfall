import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/auth-options";
import { cardPerformance, games } from "@/config/mongoCollections";
import { CardPerformanceRating, SerializedCardPerformanceNote } from "@/types";
import validation from "@/validation";

function serialize(note: any, game?: any): SerializedCardPerformanceNote {
  return {
    ...note,
    _id: note._id.toString(),
    gameId: note.gameId.toString(),
    deckId: note.deckId.toString(),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    ...(game ? { game: { date: game.date, deckName: game.deckName, result: game.result, format: game.format } } : {}),
  };
}

function getCardQuery(request: NextRequest) {
  const set = validation.verifyStr(request.nextUrl.searchParams.get("set") ?? "", "set").toLowerCase();
  const cn = validation.verifyStr(request.nextUrl.searchParams.get("cn") ?? "", "cn");
  const deckId = validation.verifyMongoId(request.nextUrl.searchParams.get("deckId") ?? "");
  return { set, cn, deckId };
}

export async function GET(request: NextRequest) {
  try {
    const cardsParam = request.nextUrl.searchParams.get("cards");
    if (cardsParam) {
      const cards = JSON.parse(cardsParam) as Array<{ set: string; cn: string }>;
      const deckId = validation.verifyMongoId(request.nextUrl.searchParams.get("deckId") ?? "");
      const keys = cards.map(card => ({ set: String(card.set).toLowerCase(), cn: String(card.cn) }));
      const records = await (await cardPerformance()).aggregate<{ _id: { set: string; cn: string }; good: number; poor: number }>([
        { $match: { deckId, $or: keys } },
        { $group: { _id: { set: "$set", cn: "$cn" }, good: { $sum: { $cond: [{ $eq: ["$rating", "good"] }, 1, 0] } }, poor: { $sum: { $cond: [{ $eq: ["$rating", "poor"] }, 1, 0] } } } },
      ]).toArray();
      return NextResponse.json({ summaries: Object.fromEntries(records.map(record => [`${record._id.set}|${record._id.cn}`, { good: record.good, poor: record.poor, score: record.good - record.poor }])) });
    }
    const { set, cn, deckId } = getCardQuery(request);
    const notes = await (await cardPerformance()).find({ set, cn, deckId }).sort({ createdAt: -1 }).toArray();
    const gameIds = notes.map(note => note.gameId).filter(id => ObjectId.isValid(id));
    const gameList = await (await games()).find({ _id: { $in: gameIds } }).toArray();
    const gameMap = new Map(gameList.map(game => [game._id?.toString(), game]));
    const serialized = notes.map(note => serialize(note, gameMap.get(note.gameId.toString())));
    const summary = serialized.reduce((result, note) => {
      result[note.rating] += 1;
      return result;
    }, { good: 0, poor: 0 } as { good: number; poor: number });
    return NextResponse.json({ notes: serialized, summary: { ...summary, score: summary.good - summary.poor } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load card performance" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession({ request, ...authOptions });
  if (!session?.user?.username) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const cardName = validation.verifyStr(body.cardName, "cardName");
    const set = validation.verifyStr(body.set, "set").toLowerCase();
    const cn = validation.verifyStr(body.cn, "cn");
    const deckId = validation.verifyMongoId(body.deckId);
    const gameId = validation.verifyMongoId(body.gameId);
    const rating = body.rating as CardPerformanceRating;
    if (rating !== "good" && rating !== "poor") throw new Error("rating must be good or poor");
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    if (notes.length > 1000) throw new Error("Notes cannot exceed 1000 characters");
    const game = await (await games()).findOne({ _id: gameId });
    if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
    if (!game.deckId || game.deckId.toString() !== deckId.toString()) {
      return NextResponse.json({ error: "That game was not played with this deck" }, { status: 400 });
    }

    const now = new Date();
    const collection = await cardPerformance();
    await collection.updateOne(
      { cardName, set, cn, deckId, gameId, creator: session.user.username },
      { $set: { rating, notes, updatedAt: now }, $setOnInsert: { cardName, set, cn, deckId, gameId, creator: session.user.username, createdAt: now } },
      { upsert: true },
    );
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save card performance" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession({ request, ...authOptions });
  if (!session?.user?.username) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const noteId = request.nextUrl.searchParams.get("id");
  if (!noteId || !ObjectId.isValid(noteId)) return NextResponse.json({ error: "Invalid note" }, { status: 400 });
  const result = await (await cardPerformance()).deleteOne({ _id: new ObjectId(noteId), creator: session.user.username });
  return result.deletedCount ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Note not found" }, { status: 404 });
}
