import { authenticatedUserId } from "@/server/auth";
import deckData from "@/data/decks";
import { ownedFilter } from "@/data/ownership";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { cardPerformance, games, users } from "@/config/mongoCollections";
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
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const cardsParam = request.nextUrl.searchParams.get("cards");
    if (cardsParam) {
      const cards = JSON.parse(cardsParam) as Array<{ set: string; cn: string }>;
      const deckId = validation.verifyMongoId(request.nextUrl.searchParams.get("deckId") ?? "");
      if (!await deckData.findDeckByMongoId(userId, deckId.toString())) return NextResponse.json({ error: "Deck not found" }, { status: 404 });
      const keys = cards.map(card => ({ set: String(card.set).toLowerCase(), cn: String(card.cn) }));
      const records = await (await cardPerformance()).aggregate<{ _id: { set: string; cn: string }; good: number; poor: number }>([
        { $match: { deckId, $or: keys } },
        { $group: { _id: { set: "$set", cn: "$cn" }, good: { $sum: { $cond: [{ $eq: ["$rating", "good"] }, 1, 0] } }, poor: { $sum: { $cond: [{ $eq: ["$rating", "poor"] }, 1, 0] } } } },
      ]).toArray();
      return NextResponse.json({ summaries: Object.fromEntries(records.map(record => [`${record._id.set}|${record._id.cn}`, { good: record.good, poor: record.poor, score: record.good - record.poor }])) });
    }
    const { set, cn, deckId } = getCardQuery(request);
    if (!await deckData.findDeckByMongoId(userId, deckId.toString())) return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    const notes = await (await cardPerformance()).find({ set, cn, deckId }).sort({ createdAt: -1 }).toArray();
    const gameIds = notes.map(note => note.gameId).filter(id => ObjectId.isValid(id));
    const gameList = await (await games()).find(ownedFilter(userId, { _id: { $in: gameIds } })).toArray();
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
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const account = await (await users()).findOne({ _id: userId }, { projection: { username: 1 } });
    if (!account?.username) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
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
    if (!await deckData.findDeckByMongoId(userId, deckId.toString())) return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    const game = await (await games()).findOne(ownedFilter(userId, { _id: gameId }));
    if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
    if (!game.deckId || game.deckId.toString() !== deckId.toString()) {
      return NextResponse.json({ error: "That game was not played with this deck" }, { status: 400 });
    }

    const now = new Date();
    const collection = await cardPerformance();
    await collection.updateOne(
      { cardName, set, cn, deckId, gameId },
      { $set: { rating, notes, updatedAt: now }, $setOnInsert: { creator: account.username, createdAt: now } },
      { upsert: true },
    );
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save card performance" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const noteId = request.nextUrl.searchParams.get("id");
  if (!noteId || !ObjectId.isValid(noteId)) return NextResponse.json({ error: "Invalid note" }, { status: 400 });
  const collection = await cardPerformance();
  const id = new ObjectId(noteId);
  const note = await collection.findOne({ _id: id }, { projection: { deckId: 1 } });
  if (!note?.deckId || !await deckData.findDeckByMongoId(userId, note.deckId.toString())) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  const result = await collection.deleteOne({ _id: id, deckId: note.deckId });
  return result.deletedCount ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Note not found" }, { status: 404 });
}
