import { ObjectId } from "mongodb";

export interface Deck {
  _id?: ObjectId;
  ownerId: string; // user ID
  name: string;
  cardIds: string[]; // references to cards
}