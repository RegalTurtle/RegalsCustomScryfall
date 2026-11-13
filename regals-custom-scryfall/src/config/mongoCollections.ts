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

import type { User, Deck, Card, Game, CardPerformanceNote } from "@/types";
import type { InventoryCard } from "@/types/card";

export const users = getCollectionFn<User>("users");
export const decks = getCollectionFn<Deck>("decks");
export const bulkCards = getCollectionFn<InventoryCard>("bulk_cards");
export const coolCards = getCollectionFn<InventoryCard>("cool_cards");
export const tradeBinder = getCollectionFn<InventoryCard>("trade_binder");
export const cardWatchlist = getCollectionFn<InventoryCard>("card_watchlist");
export const games = getCollectionFn<Game>("games");
export const cardPerformance = getCollectionFn<CardPerformanceNote>("card_performance");
