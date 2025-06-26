import { ObjectId } from "mongodb";

export interface Game {
  _id?: ObjectId;
  players?: Array<string>;
  winner?: string;
  date: string;
  win: boolean;
}