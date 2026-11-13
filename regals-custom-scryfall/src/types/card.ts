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
  updatedAt: Date | null;
  image: string;
  oracle: string;
  tag?: string[];
  color: string;
  color_identity: string;
  type: string;
  cmc: number;
}

/** Inventory and watchlist roots require ownership; embedded deck cards inherit it. */
export interface InventoryCard extends Card {
  userId: ObjectId;
}
