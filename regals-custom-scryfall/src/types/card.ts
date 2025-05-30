import { ObjectId } from "mongodb";
import { FoilOption } from "./foil_options";

export interface Card {
  _id?: ObjectId;
  name: string;
  quant: number;
  set: string;
  cn: string;
  foil: FoilOption;
  proxy: boolean;
  decks: string[];
  updatedAt: Date | null;
}