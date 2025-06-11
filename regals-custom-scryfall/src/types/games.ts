import { ObjectId } from "mongodb";

export interface Deck {
  _id?: ObjectId;
  win: boolean;
  players?: string;
}