import { Collection, Document } from "mongodb";
import { dbConnection } from "@/config/mongoConnections";

const getCollectionFn = <T extends Document>(collection: string): (() => Promise<Collection<T>>) => {
  let _collection: Collection<T> | undefined = undefined;

  return async () => {
    if (!_collection) {
      const db = await dbConnection();
      _collection = db.collection<T>(collection);
    }

    return _collection;
  };
};

// Import your types
import type { User, Deck, Card, Game } from "@/types";

// Pass the type to each one!
export const users = getCollectionFn<User>("users");
export const decks = getCollectionFn<Deck>("decks");
export const cards = getCollectionFn<Card>("cards");
export const games = getCollectionFn<Game>("games");