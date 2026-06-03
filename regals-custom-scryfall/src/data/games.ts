import { games } from "@/config/mongoCollections";
import { Game, GameCreateInput, GameResult, GameStats, SerializedGame } from "@/types";
import validation from "@/validation";
import { Collection, Filter, ObjectId } from "mongodb";

type GameFilters = {
  deckId?: string;
  format?: string;
  result?: GameResult;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
};

function verifyGameResult(result: string): GameResult {
  result = validation.verifyStr(result, "result").toLowerCase();
  if (result !== "win" && result !== "loss" && result !== "tie") throw new Error("result must be win, loss, or tie");
  return result;
}

function verifyDateInput(date: string): string {
  date = validation.verifyStr(date, "date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("date must be YYYY-MM-DD");
  return date;
}

function serializeGame(game: Game): SerializedGame {
  return {
    ...game,
    _id: game._id?.toString() ?? "",
    deckId: game.deckId?.toString(),
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
  };
}

function buildGameQuery(filters: GameFilters): Filter<Game> {
  const query: Filter<Game> = {};

  if (filters.deckId) {
    query.deckId = validation.verifyMongoId(filters.deckId);
  }

  if (filters.format) {
    query.format = validation.verifyStr(filters.format, "format");
  }

  if (filters.result) {
    query.result = verifyGameResult(filters.result);
  }

  const dateQuery: { $gte?: string; $lte?: string } = {};
  if (filters.dateFrom) dateQuery.$gte = verifyDateInput(filters.dateFrom);
  if (filters.dateTo) dateQuery.$lte = verifyDateInput(filters.dateTo);
  if (Object.keys(dateQuery).length > 0) query.date = dateQuery;

  return query;
}

const getGames = async (filters: GameFilters = {}): Promise<SerializedGame[]> => {
  const gameCollection: Collection<Game> = await games();
  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 500);
  const foundGames = await gameCollection
    .find(buildGameQuery(filters))
    .sort({ date: -1, createdAt: -1 })
    .limit(limit)
    .toArray();

  return foundGames.map(serializeGame);
};

const addGame = async (input: GameCreateInput): Promise<string> => {
  const date = verifyDateInput(input.date);
  const format = validation.verifyStr(input.format, "format");
  const result = verifyGameResult(input.result);
  const numPlayers = validation.verifyInteger(Number(input.numPlayers), "numPlayers");
  if (numPlayers < 1) throw new Error("numPlayers must be at least 1");

  const rawTurnNumber = input.turnNumber;
  let turnNumber: number | null = null;
  if (rawTurnNumber !== undefined && rawTurnNumber !== null && rawTurnNumber !== "") {
    turnNumber = validation.verifyInteger(Number(rawTurnNumber), "turnNumber");
    if (turnNumber < 1) throw new Error("turnNumber must be at least 1");
  }

  const deckName = validation.verifyStr(input.deckName, "deckName");
  const notes = typeof input.notes === "string" ? input.notes : "";
  const now = new Date();
  const newGame: Game = {
    date,
    format,
    result,
    numPlayers,
    turnNumber,
    deckName,
    notes,
    createdAt: now,
    updatedAt: now,
  };

  if (input.deckId) {
    newGame.deckId = validation.verifyMongoId(input.deckId);
  }

  if (input.deckLink) {
    newGame.deckLink = validation.verifyStr(input.deckLink, "deckLink");
  }

  const gameCollection: Collection<Game> = await games();
  const { acknowledged, insertedId } = await gameCollection.insertOne(newGame);
  if (!acknowledged) throw new Error("Database error");

  return insertedId.toString();
};

const deleteGame = async (gameId: string): Promise<void> => {
  const _id: ObjectId = validation.verifyMongoId(gameId);
  const gameCollection: Collection<Game> = await games();
  const result = await gameCollection.deleteOne({ _id });
  if (result.deletedCount === 0) throw new Error("Game not found");
};

const updateDeckSnapshot = async (
  deckId: string,
  deckName: string,
  deckLink: string | null,
): Promise<void> => {
  const deckObjectId = validation.verifyMongoId(deckId);
  deckName = validation.verifyStr(deckName, "deckName");
  if (deckLink) deckLink = validation.verifyStr(deckLink, "deckLink");

  const gameCollection: Collection<Game> = await games();
  await gameCollection.updateMany(
    { deckId: deckObjectId },
    {
      $set: {
        deckName,
        updatedAt: new Date(),
        ...(deckLink ? { deckLink } : {}),
      },
      ...(deckLink ? {} : { $unset: { deckLink: "" } }),
    }
  );
};

function getGameStats(gameList: SerializedGame[]): GameStats {
  const total = gameList.length;
  const wins = gameList.filter(game => game.result === "win").length;
  const losses = gameList.filter(game => game.result === "loss").length;
  const ties = gameList.filter(game => game.result === "tie").length;
  const gamesWithTurn = gameList.filter(game => typeof game.turnNumber === "number");
  const averageTurn = gamesWithTurn.length
    ? gamesWithTurn.reduce((sum, game) => sum + Number(game.turnNumber ?? 0), 0) / gamesWithTurn.length
    : null;

  return {
    total,
    wins,
    losses,
    ties,
    winRate: total ? wins / total : 0,
    averageTurn,
  };
}

export default {
  getGames,
  addGame,
  deleteGame,
  updateDeckSnapshot,
  getGameStats,
};
