import { ObjectId } from "mongodb";
import { DeckChange } from "@/types";

export interface Deck {
  _id?: ObjectId;
  owner: string;
  link?: string;
  name: string;
  cards: Array<string>;
  changes: Array<DeckChange>;
  lastUpdate: Date;
  notes: string;
  commander?: string;
  colorId?: string;
  format: string;
}