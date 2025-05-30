import { ObjectId } from "mongodb";

export interface Game {
  _id?: ObjectId;
  players: string[];
  date: string; // ISO string or Date if you prefer
  winner: string;
}