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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

////////////////////////////////////////////////
//                                            //
//    Code for replacing stuff starts here    //
//                                            //
////////////////////////////////////////////////

const decks = getCollectionFn("decks");
const decksCollection = await decks();
const allDecks = await decksCollection.find({}).toArray();

const WUBRG = ["W", "U", "B", "R", "G"];
const lists = ["cards", "sideboard", "maybeboard", "wishlist"];

for (const deck of allDecks) {
  let updated = false;

  for (const listName of lists) {
    if (!Array.isArray(deck[listName])) continue;

    for (const card of deck[listName]) {
      try {
        await sleep(100);
        const { set, cn } = card;

        const res = await fetch(`https://api.scryfall.com/cards/${set}/${cn}`);
        const scryfallCard = await res.json();

        const scryfallColors = scryfallCard.colors
          ? WUBRG.filter(c => scryfallCard.colors.includes(c)).join("")
          : `${WUBRG.filter(c => scryfallCard.card_faces[0].colors.includes(c)).join("")} // ${WUBRG.filter(c => scryfallCard.card_faces[1].colors.includes(c)).join("")}`;

        const scryfallIdentity = WUBRG.filter(c => scryfallCard.color_identity.includes(c)).join("");
        const scryfallTypeline = scryfallCard.type_line;
        const scryfallCMC = scryfallCard.cmc;

        // Add new fields to the card
        card.color = scryfallColors;
        card.color_identity = scryfallIdentity;
        card.type = scryfallTypeline;
        card.cmc = scryfallCMC;

        console.log(`${deck._id}: ${set} | ${cn} enriched`);
        updated = true;

      } catch (e) {
        console.error(`Deck ${deck._id}: Failed on ${card.set} | ${card.cn}:`, e);
      }
    }
  }

  if (updated) {
    await decksCollection.updateOne(
      { _id: deck._id },
      {
        $set: {
          cards: deck.cards || [],
          sideboard: deck.sideboard || [],
          maybeboard: deck.maybeboard || [],
          wishlist: deck.wishlist || [],
          updatedAt: new Date(),
        },
      }
    );
  }
}






/*
const al = await bulkCardsCollection.find({}).toArray();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const errors = [];

for (let card of allCards) {

}

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
console.log(errors);*/