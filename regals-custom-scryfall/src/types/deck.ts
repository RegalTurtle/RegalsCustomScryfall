import { ObjectId } from "mongodb";
import { Card, DeckChange, Game } from "@/types";

export interface Deck {
  _id?: ObjectId;
  owner: string;
  link?: string;
  name: string;
  cards: Array<Card>;
  changes: Array<DeckChange>;
  lastUpdate: Date;
  notes: string;
  commander?: Card;
  colorId?: string;
  format: string;
  games: Array<Game>;
  wins: number;
  losses: number;
  sideboard: Card[];
  maybeboard: Card[];
}