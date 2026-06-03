import { ObjectId } from "mongodb";

export type GameResult = "win" | "loss" | "tie";

export interface Game {
  _id?: ObjectId;
  date: string;
  format: string;
  result: GameResult;
  numPlayers: number;
  turnNumber?: number | null;
  deckId?: ObjectId;
  deckName: string;
  deckLink?: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  players?: Array<string>;
  winner?: string;
  win?: boolean;
}

export type SerializedGame = Omit<Game, "_id" | "deckId" | "createdAt" | "updatedAt"> & {
  _id: string;
  deckId?: string;
  createdAt: string;
  updatedAt: string;
};

export type GameStats = {
  total: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  averageTurn: number | null;
};

export type GameCreateInput = {
  date: string;
  format: string;
  result: GameResult;
  numPlayers: number;
  turnNumber?: number | string | null;
  deckId?: string;
  deckName: string;
  deckLink?: string;
  notes?: string;
}
