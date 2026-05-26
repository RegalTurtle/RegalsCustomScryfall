import { bulkCards, coolCards, decks } from "@/config/mongoCollections";
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

export const replaceCards = async (
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

const replaceProxyWithOwnedCard = async (
  deckId: string,
  originalSet: string,
  originalCn: string,
  collection: "bulk" | "cool-cards",
  collectionCardId: string
) => {
  if (!ObjectId.isValid(deckId)) throw new Error("deckId invalid");
  originalSet = validation.verifyStr(originalSet, "originalSet");
  originalCn = validation.verifyStr(originalCn, "originalCn");
  if (collection !== "bulk" && collection !== "cool-cards") throw new Error("collection invalid");
  const ownedCardId = validation.verifyMongoId(collectionCardId);

  const deckCollection: Collection<Deck> = await decks();
  const ownedCollection: Collection<Card> = collection === "bulk" ? await bulkCards() : await coolCards();

  const deck = await deckCollection.findOne({ _id: new ObjectId(deckId) });
  if (!deck) throw new Error("Deck not found");

  const deckCardIndex = deck.cards.findIndex(card => card.set === originalSet && card.cn === originalCn && card.proxy);
  if (deckCardIndex === -1) throw new Error("Proxy card not found in deck");

  const deckCard = deck.cards[deckCardIndex];
  const ownedCard = await ownedCollection.findOne({ _id: ownedCardId });
  if (!ownedCard) throw new Error("Owned card not found");
  if (ownedCard.name !== deckCard.name) throw new Error("Owned card does not match deck card");
  if (ownedCard.quant < deckCard.quant) throw new Error("Not enough owned copies");

  const replacementCard: Card = {
    ...ownedCard,
    quant: deckCard.quant,
    proxy: false,
    tag: (deckCard.tag ?? []).filter(tag => tag.toLowerCase() !== "proxy"),
    updatedAt: new Date(),
  };
  delete replacementCard._id;

  deck.cards.splice(deckCardIndex, 1);

  const existingIndex = deck.cards.findIndex(card => (
    card.set === replacementCard.set &&
    card.cn === replacementCard.cn &&
    card.foil === replacementCard.foil &&
    !card.proxy
  ));

  if (existingIndex >= 0) {
    deck.cards[existingIndex].quant += replacementCard.quant;
    deck.cards[existingIndex].tag = Array.from(new Set([
      ...(deck.cards[existingIndex].tag ?? []),
      ...(replacementCard.tag ?? []),
    ]));
    deck.cards[existingIndex].updatedAt = new Date();
  } else {
    deck.cards.splice(deckCardIndex, 0, replacementCard);
  }

  const remainingOwnedQuant = ownedCard.quant - deckCard.quant;
  if (remainingOwnedQuant < 1) {
    await ownedCollection.deleteOne({ _id: ownedCardId });
  } else {
    await ownedCollection.updateOne(
      { _id: ownedCardId },
      { $set: { quant: remainingOwnedQuant, updatedAt: new Date() } }
    );
  }

  await deckCollection.updateOne(
    { _id: new ObjectId(deckId) },
    { $set: { cards: deck.cards, lastUpdate: new Date() } }
  );
};

export default {
  addDeck,
  findDeckByMongoId,
  getAllDecks,
  setTags,
  replaceCards,
  replaceProxyWithOwnedCard,
};
