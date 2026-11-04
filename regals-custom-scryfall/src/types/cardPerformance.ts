import { ObjectId } from "mongodb";

export type CardPerformanceRating = "good" | "poor";

export interface CardPerformanceNote {
  _id?: ObjectId;
  cardName: string;
  set: string;
  cn: string;
  deckId: ObjectId;
  gameId: ObjectId;
  rating: CardPerformanceRating;
  notes: string;
  creator: string;
  createdAt: Date;
  updatedAt: Date;
}

export type SerializedCardPerformanceNote = Omit<CardPerformanceNote, "_id" | "gameId" | "createdAt" | "updatedAt"> & {
  _id: string;
  gameId: string;
  deckId: string;
  createdAt: string;
  updatedAt: string;
  game?: {
    date: string;
    deckName: string;
    result: string;
    format: string;
  };
};

export type CardPerformanceSummary = {
  good: number;
  poor: number;
  score: number;
};
