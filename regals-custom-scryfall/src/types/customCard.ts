import { ObjectId } from "mongodb";

export type CustomCardNote = {
  date: string;
  creator: string;
  notes: string;
};

export interface CustomCard {
  _id?: ObjectId;
  name: string;
  cost?: string;
  type: string;
  text?: string;
  flavor?: string;
  rarity?: string;
  cn: number;
  set: string;
  artist?: string;
  img: string;
  img_backside?: string;
  id?: string;
  color?: string;
  has_bleed_edge?: boolean;
  power?: number;
  toughness?: number;
  notes: CustomCardNote[];
  tags?: {
    frame?: string;
    function?: string[];
    reprint?: boolean;
    [key: string]: unknown;
  };
  invisible?: boolean;
  nickname?: string;
  dfc?: boolean;
  watermark?: string;
  "art-remarks"?: string;
}
