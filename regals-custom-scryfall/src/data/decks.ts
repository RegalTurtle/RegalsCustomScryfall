import { decks } from "@/config/mongoCollections";
import { Card, Deck } from "@/types";
import validation from "@/validation"
import { Collection, ObjectId } from "mongodb";

const addDeck = async (
  name: string,
  link: string | null,
  owner: string,
  format: string,
  colorId: string | null,
) => {
  name = validation.verifyStr(name, `name`);
  owner = validation.verifyStr(owner, `owner`);
  format = validation.verifyStr(format, `format`);

  const newDeck: Deck = {
    owner,
    name,
    cards: [],
    changes: [],
    lastUpdate: new Date(),
    notes: "",
    format,
    games: [],
    wins: 0,
    losses: 0,
    sideboard: [],
    maybeboard: [],
    wishlist: [],
    together: true,
  };

  if (link) {
    link = validation.verifyStr(link, `link`);
    newDeck.link = link;
  }
  if (colorId) {
    colorId = validation.verifyStr(colorId, `colorId`);
    newDeck.colorId = colorId;
  }

  const deckCollection = await decks();
  const { acknowledged, insertedId } = await deckCollection.insertOne(newDeck);
  if (!acknowledged) {
    throw new Error("Database error");
  }
  return insertedId;
}

const findDeckByMongoId = async (deckId: string) => {
  if (!ObjectId.isValid(deckId)) throw new Error(`deckId invalid`);
  const mongoId = ObjectId.createFromHexString(deckId);

  const deckCollection = await decks();
  const deck = await deckCollection.findOne({ _id: mongoId });
  
  return deck;
}

const getAllDecks = async () => {
  const deckCollection: Collection<Deck> = await decks();
  const allDecks = await deckCollection.find({}).toArray();

  return allDecks;
}

const setTags = async (
  deckId: string,
  set: string,
  cn: string,
  updatedTags: string[]
) => {
  if (!ObjectId.isValid(deckId)) throw new Error("deckId invalid");

  const deckCollection: Collection<Deck> = await decks();

  await deckCollection.updateOne(
    { _id: new ObjectId(deckId) },
    {
      $set: {
        "cards.$[elem].tag": updatedTags,
        lastUpdate: new Date(),
      },
    },
    {
      arrayFilters: [{ "elem.set": set, "elem.cn": cn }],
    }
  );
};

const replaceCards = async (
  deckId: string,
  cards: Card[]
) => {
  if (!ObjectId.isValid(deckId)) throw new Error("deckId invalid");
  if (!Array.isArray(cards)) throw new Error("cards must be an array");

  const deckCollection: Collection<Deck> = await decks();
  const result = await deckCollection.updateOne(
    { _id: new ObjectId(deckId) },
    {
      $set: {
        cards: cards.map(card => ({
          ...card,
          updatedAt: new Date(),
        })),
        lastUpdate: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) throw new Error("Deck not found");
};

export default {
  addDeck,
  findDeckByMongoId,
  getAllDecks,
  setTags,
  replaceCards,
};
