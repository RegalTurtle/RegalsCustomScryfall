import { Collection, Document } from "mongodb";
import { dbConnection } from "@/config/mongoConnections";
import { CustomCard } from "@/types/customCard";

let collection: Collection<CustomCard> | undefined;

export const customCards = async (): Promise<Collection<CustomCard>> => {
  if (!collection) {
    const db = await dbConnection();
    collection = db.collection<CustomCard>("custom_cards");
  }

  return collection;
};
