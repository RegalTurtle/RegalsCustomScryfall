import { dbConnection } from "./mongoConnections.js";

const getCollectionFn = (collection) => {
  let _col = undefined;

  return async () => {
    if (!_col) {
      const db = await dbConnection();
      _col = await db.collection(collection);
    }

    return _col;
  };
};

export const users = getCollectionFn("users");
export const decks = getCollectionFn("decks");
export const cards = null;
export const games = getCollectionFn("games");
