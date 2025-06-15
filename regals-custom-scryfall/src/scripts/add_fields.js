import { MongoClient } from "mongodb";
import dotenv from "dotenv"; // Import dotenv to load environment variables

dotenv.config(); // Loads the variables from .env file

let _connection = undefined;
let _db = undefined;

export const dbConnection = async () => {
  if (!_connection) {
    _connection = await MongoClient.connect(process.env.MONGO_URL || ""); // Use environment variable
    _db = _connection.db(process.env.DATABASE_NAME); // Use environment variable
  }
  if (_db) {
    return _db;
  }
  throw new Error(`Database not found`);
};

const getCollectionFn = (collection) => {
  let _collection = undefined;

  return async () => {
    if (!_collection) {
      const db = await dbConnection();
      _collection = db.collection(collection);
    }

    return _collection;
  };
};

const bulkCards = getCollectionFn("bulk_cards");

const bulkCardsCollection = await bulkCards();
// const allCards = await bulkCardsCollection.find({}).toArray();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// const errors = [];

// for (let card of allCards) {
//   await sleep(100);

//   const set = card.set;
//   const cn = card.cn;

//   // const res = await fetch(`https://api.scryfall.com/cards/${set}/${cn}/`);
//   // const scryfallCard = await res.json();

//   await bulkCardsCollection.updateOne(
//     { _id: card._id },
//     { $set: { image: imageUrl, oracle: scryfallOracle, updatedAt: new Date() } }
//   );
//   console.log(`${set} | ${cn} done`);
// }

await bulkCardsCollection.updateMany(
  {},
  { $unset: { locations: [] } }
);

console.log("Done!");
