import { bulkCards, coolCards, decks } from "@/config/mongoCollections";
import { Card, Deck } from "@/types";
import validation from "@/validation"
import { Collection, ObjectId } from "mongodb";

type DeckSection = "cards" | "sideboard" | "maybeboard" | "wishlist";

const addDeck = async (
  name: string,
  link: string | null,
  owner: string,
  format: string,
  colorId: string | null,
  mainForColorIdentity: boolean = false,
) => {
  name = validation.verifyStr(name, `name`);
  owner = validation.verifyStr(owner, `owner`);
  format = validation.verifyStr(format, `format`);
  if (typeof mainForColorIdentity !== "boolean") throw new Error("mainForColorIdentity must be a boolean");

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
    mainForColorIdentity,
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

  if (mainForColorIdentity) {
    await deckCollection.updateMany(
      {
        _id: { $ne: insertedId },
        format,
        ...(colorId ? { colorId } : { $or: [{ colorId: { $exists: false } }, { colorId: "" }] }),
      },
      { $set: { mainForColorIdentity: false } }
    );
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

const updateDeckSettings = async (
  deckId: string,
  name: string,
  link: string | null,
  owner: string,
  format: string,
  colorId: string | null,
  mainForColorIdentity: boolean,
  notes: string = "",
) => {
  if (!ObjectId.isValid(deckId)) throw new Error("deckId invalid");
  name = validation.verifyStr(name, "name");
  owner = validation.verifyStr(owner, "owner");
  format = validation.verifyStr(format, "format");
  if (typeof notes !== "string") throw new Error("notes must be a string");
  if (typeof mainForColorIdentity !== "boolean") throw new Error("mainForColorIdentity must be a boolean");

  const deckUpdate: Partial<Deck> = {
    name,
    owner,
    format,
    notes,
    mainForColorIdentity,
    lastUpdate: new Date(),
  };

  if (link) deckUpdate.link = validation.verifyStr(link, "link");
  if (colorId) deckUpdate.colorId = validation.verifyStr(colorId, "colorId");

  const unsetFields: Record<string, ""> = {};
  if (!link) unsetFields.link = "";
  if (!colorId) unsetFields.colorId = "";

  const deckCollection: Collection<Deck> = await decks();
  const result = await deckCollection.updateOne(
    { _id: new ObjectId(deckId) },
    {
      $set: deckUpdate,
      ...(Object.keys(unsetFields).length > 0 ? { $unset: unsetFields } : {}),
    }
  );

  if (result.matchedCount === 0) throw new Error("Deck not found");

  if (mainForColorIdentity) {
    await deckCollection.updateMany(
      {
        _id: { $ne: new ObjectId(deckId) },
        format,
        ...(colorId ? { colorId } : { $or: [{ colorId: { $exists: false } }, { colorId: "" }] }),
      },
      { $set: { mainForColorIdentity: false } }
    );
  }
}

const setTags = async (
  deckId: string,
  set: string,
  cn: string,
  updatedTags: string[],
  deckSection: DeckSection = "cards"
) => {
  if (!ObjectId.isValid(deckId)) throw new Error("deckId invalid");

  const deckCollection: Collection<Deck> = await decks();

  await deckCollection.updateOne(
    { _id: new ObjectId(deckId) },
    {
      $set: {
        [`${deckSection}.$[elem].tag`]: updatedTags,
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

const moveCardCopies = async (
  deckId: string,
  sourceSection: DeckSection,
  targetSection: DeckSection,
  set: string,
  cn: string,
  foil: Card["foil"],
  proxy: boolean,
  quant: number,
) => {
  if (!ObjectId.isValid(deckId)) throw new Error("deckId invalid");
  if (!["cards", "sideboard", "maybeboard", "wishlist"].includes(sourceSection)) throw new Error("sourceSection invalid");
  if (!["cards", "sideboard", "maybeboard", "wishlist"].includes(targetSection)) throw new Error("targetSection invalid");
  if (sourceSection === targetSection) throw new Error("Sections must be different");
  set = validation.verifyStr(set, "set");
  cn = validation.verifyStr(cn, "cn");
  foil = validation.verifyFoilType(foil);
  proxy = validation.verifyBool(proxy, "proxy");
  quant = validation.verifyInteger(quant, "quant");
  if (quant < 1) throw new Error("quant must be at least 1");

  const deckCollection: Collection<Deck> = await decks();
  const deck = await deckCollection.findOne({ _id: new ObjectId(deckId) });
  if (!deck) throw new Error("Deck not found");

  const sourceCards = deck[sourceSection] ?? [];
  const targetCards = deck[targetSection] ?? [];
  const sourceIndex = sourceCards.findIndex(card => (
    card.set === set &&
    card.cn === cn &&
    card.foil === foil &&
    card.proxy === proxy
  ));

  if (sourceIndex === -1) throw new Error("Card not found in source section");

  const sourceCard = sourceCards[sourceIndex];
  if (sourceCard.quant < quant) throw new Error("Not enough copies to move");

  const movedCard: Card = {
    ...sourceCard,
    quant,
    updatedAt: new Date(),
  };
  delete movedCard._id;

  const remainingSourceQuant = sourceCard.quant - quant;
  if (remainingSourceQuant < 1) {
    sourceCards.splice(sourceIndex, 1);
  } else {
    sourceCards[sourceIndex] = {
      ...sourceCard,
      quant: remainingSourceQuant,
      updatedAt: new Date(),
    };
  }

  const targetIndex = targetCards.findIndex(card => (
    card.set === movedCard.set &&
    card.cn === movedCard.cn &&
    card.foil === movedCard.foil &&
    card.proxy === movedCard.proxy
  ));

  if (targetIndex >= 0) {
    targetCards[targetIndex] = {
      ...targetCards[targetIndex],
      quant: targetCards[targetIndex].quant + quant,
      tag: Array.from(new Set([
        ...(targetCards[targetIndex].tag ?? []),
        ...(movedCard.tag ?? []),
      ])),
      updatedAt: new Date(),
    };
  } else {
    targetCards.push(movedCard);
  }

  await deckCollection.updateOne(
    { _id: new ObjectId(deckId) },
    {
      $set: {
        [sourceSection]: sourceCards,
        [targetSection]: targetCards,
        lastUpdate: new Date(),
      },
    }
  );
};

const replaceProxyWithOwnedCard = async (
  deckId: string,
  originalSet: string,
  originalCn: string,
  collection: "bulk" | "cool-cards",
  collectionCardId: string,
  returnCollection?: "bulk" | "cool-cards"
) => {
  if (!ObjectId.isValid(deckId)) throw new Error("deckId invalid");
  originalSet = validation.verifyStr(originalSet, "originalSet");
  originalCn = validation.verifyStr(originalCn, "originalCn");
  if (collection !== "bulk" && collection !== "cool-cards") throw new Error("collection invalid");
  if (returnCollection && returnCollection !== "bulk" && returnCollection !== "cool-cards") throw new Error("returnCollection invalid");
  const ownedCardId = validation.verifyMongoId(collectionCardId);

  const deckCollection: Collection<Deck> = await decks();
  const ownedCollection: Collection<Card> = collection === "bulk" ? await bulkCards() : await coolCards();
  const returnedCollection: Collection<Card> = (returnCollection ?? collection) === "bulk" ? await bulkCards() : await coolCards();

  const deck = await deckCollection.findOne({ _id: new ObjectId(deckId) });
  if (!deck) throw new Error("Deck not found");

  const deckCardIndex = deck.cards.findIndex(card => card.set === originalSet && card.cn === originalCn);
  if (deckCardIndex === -1) throw new Error("Card not found in deck");

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

  if (!deckCard.proxy) {
    const returnedCard: Card = {
      ...deckCard,
      updatedAt: new Date(),
    };
    delete returnedCard._id;
    delete returnedCard.tag;

    const existingReturnedCard = await returnedCollection.findOne({
      set: returnedCard.set,
      cn: returnedCard.cn,
      foil: returnedCard.foil,
      proxy: returnedCard.proxy,
    });

    if (existingReturnedCard) {
      await returnedCollection.updateOne(
        { _id: existingReturnedCard._id },
        {
          $set: {
            quant: existingReturnedCard.quant + returnedCard.quant,
            updatedAt: new Date(),
            image: returnedCard.image,
          },
        }
      );
    } else {
      await returnedCollection.insertOne(returnedCard);
    }
  }

  await deckCollection.updateOne(
    { _id: new ObjectId(deckId) },
    { $set: { cards: deck.cards, lastUpdate: new Date() } }
  );
};

const addPlannedChange = async (
  deckId: string,
  cardOut: string,
  cardIn: string,
) => {
  if (!ObjectId.isValid(deckId)) throw new Error("deckId invalid");
  cardOut = validation.verifyStr(cardOut, "cardOut");
  cardIn = validation.verifyStr(cardIn, "cardIn");

  const deckCollection: Collection<Deck> = await decks();
  const result = await deckCollection.updateOne(
    { _id: new ObjectId(deckId) },
    {
      $push: {
        changes: {
          date: new Date(),
          cardOut,
          cardIn,
        },
      },
      $set: {
        lastUpdate: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) throw new Error("Deck not found");
}

const removePlannedChange = async (
  deckId: string,
  changeIndex: number,
) => {
  if (!ObjectId.isValid(deckId)) throw new Error("deckId invalid");
  changeIndex = validation.verifyInteger(changeIndex, "changeIndex");
  if (changeIndex < 0) throw new Error("changeIndex must be at least 0");

  const deckCollection: Collection<Deck> = await decks();
  const deck = await deckCollection.findOne({ _id: new ObjectId(deckId) });
  if (!deck) throw new Error("Deck not found");
  if (changeIndex >= deck.changes.length) throw new Error("Planned change not found");

  deck.changes.splice(changeIndex, 1);

  await deckCollection.updateOne(
    { _id: new ObjectId(deckId) },
    {
      $set: {
        changes: deck.changes,
        lastUpdate: new Date(),
      },
    }
  );
}

export default {
  addDeck,
  findDeckByMongoId,
  getAllDecks,
  updateDeckSettings,
  setTags,
  moveCardCopies,
  addPlannedChange,
  removePlannedChange,
  replaceCards,
  replaceProxyWithOwnedCard,
};
