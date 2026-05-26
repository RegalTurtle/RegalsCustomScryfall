import { bulkCards, coolCards, decks, tradeBinder } from "@/config/mongoCollections";
import validation from "@/validation";
import { Collection, Document, ObjectId } from "mongodb";
import { Card, CollectionTypeOption, FoilOption } from "@/types";

/**
 * Given a string representation of an ObjectId, finds that card in the database
 * @param id The string representation of the ObjectId
 * @returns A card object, or throws an error if the card isn't found
 */
const getCardByMongoId = async (id: string): Promise<Card> => {
  const _id: ObjectId = validation.verifyMongoId(id);
  
  const bulkCardsCollection: Collection<Card> = await bulkCards();
  let card: Card | null = await bulkCardsCollection.findOne({ _id });

  if (!card) throw new Error(`Card not found`);

  return card;
}

/**
 * Finds a card with a given set, collector number, and foil option
 * @param set A set code
 * @param cn A collector number
 * @param foilOption A FoilOption for the card
 * @returns A card object, or throws an error if the card is not found
 */
const getCardBySetCn = async (set: string, cn: string, foilOption: FoilOption): Promise<Card> => {
  set = validation.verifyStr(set, `set`);
  cn = validation.verifyStr(cn, `cn`);
  foilOption = validation.verifyFoilType(foilOption);

  const bulkCardsCollection: Collection<Card> = await bulkCards();
  let card: Card | null = await bulkCardsCollection.findOne({ set, cn, foil: foilOption });

  if (!card) throw new Error(`Card not found`);

  return card;
}

/**
 * Gets a page of card objects in my bulk
 * @param page Page number to navigate to
 * @returns An array of 20 card objects
 */
const getPageOfCardsBulk = async (page: number): Promise<Array<Card>> => {
  const bulkCardsCollection: Collection<Card> = await bulkCards();
  let cardPage: Array<Card> = await bulkCardsCollection.find().sort({ updatedAt: -1 }).skip((page-1)*20).limit(20).toArray();
  
  return cardPage;
}

/**
 * Gets the most recently changed 20 card entries from a collection of cards 
 * @param page The page number to get
 * @param collection_type Either bulk, cool-cards, or trade-binder depending on which collection to get
 * @returns The most recent 20 changes to the collection
 */
const getPageOfCards = async ( page: number, collection_type: "bulk" | "cool-cards" | "trade-binder" ): Promise<Array<Card>> => {
  let cardCollection: Collection<Card>;
  if (collection_type === "bulk") {
    cardCollection = await bulkCards();
  } else if (collection_type === "cool-cards") {
    cardCollection = await coolCards();
  } else if (collection_type === "trade-binder") {
    cardCollection = await tradeBinder();
  } else {
    throw new Error("collection_type invalid");
  }
  let cardPage: Array<Card> = await cardCollection.find().sort({ updatedAt: -1 }).skip((page - 1) * 20).limit(20).toArray();

  return cardPage;
}

const getOwnedVersionsByName = async (name: string): Promise<Array<Card & { collection: "bulk" | "cool-cards", collectionLabel: string }>> => {
  name = validation.verifyStr(name, "name");

  const bulkCardsCollection: Collection<Card> = await bulkCards();
  const coolCardsCollection: Collection<Card> = await coolCards();

  const [bulkMatches, coolMatches] = await Promise.all([
    bulkCardsCollection.find({ name, quant: { $gt: 0 } }).sort({ set: 1, cn: 1 }).toArray(),
    coolCardsCollection.find({ name, quant: { $gt: 0 } }).sort({ set: 1, cn: 1 }).toArray(),
  ]);

  return [
    ...bulkMatches.map(card => ({ ...card, collection: "bulk" as const, collectionLabel: "Bulk" })),
    ...coolMatches.map(card => ({ ...card, collection: "cool-cards" as const, collectionLabel: "Cool Cards" })),
  ];
}

/**
 * Given information about the card, modifies the database by adding or removing quant number of that card
 * @param name Name of the card to add
 * @param quant Quantity of card to add
 * @param set Set code of card
 * @param cn Collector number of card
 * @param foil The foil option of the card
 * @param proxy Whether the card is a proxy or not
 * @returns Undefined
 */
const addCard = async (
  collection_type: CollectionTypeOption,
  name: string, 
  quant: number, 
  set: string, 
  cn: string, 
  foil: FoilOption, 
  proxy: boolean, 
  image: string,
  oracle: string,
  color: string,
  color_identity: string,
  type: string,
  cmc: number,
  tag: string[] = [],
): Promise<undefined> => {
  collection_type = validation.verifyCollectionType(collection_type);
  name = validation.verifyStr(name, `name`);
  quant = validation.verifyInteger(quant, `quant`);
  set = validation.verifyStr(set, `set`);
  cn = validation.verifyStr(cn, `cn`);
  foil = validation.verifyFoilType(foil);
  proxy = validation.verifyBool(proxy, `proxy`);
  image = validation.verifyStr(image, `image`);
  if (typeof oracle !== "string") throw new Error("oracle must be a string");
  color = validation.verifyColorIdOrdered(color);
  color_identity = validation.verifyColorIdOrdered(color_identity);
  type = validation.verifyStr(type, `type`);
  // TODO: Add a validation fn for this
  if (typeof cmc !== "number") throw new Error("cmc must be a number");
  if (!Array.isArray(tag) || tag.some(t => typeof t !== "string")) throw new Error("tag must be an array of strings");
  
  let cardsCollection: Collection<Card>;
  if (collection_type === "bulk") {
    cardsCollection = await bulkCards();
  } else if (collection_type === "cool-cards") {
    cardsCollection = await coolCards();
  } else if (collection_type === "trade-binder") {
    cardsCollection = await tradeBinder();
  } else if (collection_type.startsWith("decks+")) {
    const decksCollection = await decks();
    let deckId = collection_type.slice(6);

    // Determine which list to update
    let listKey = "cards";
    if (deckId.startsWith("sideboard+")) {
      listKey = "sideboard";
      deckId = deckId.slice("sideboard+".length);
    } else if (deckId.startsWith("maybeboard+")) {
      listKey = "maybeboard";
      deckId = deckId.slice("maybeboard+".length);
    } else if (deckId.startsWith("wishlist+")) {
      listKey = "wishlist";
      deckId = deckId.slice("wishlist+".length);
    }

    const deck = await decksCollection.findOne({ _id: ObjectId.createFromHexString(deckId) });
    if (!deck) throw new Error(`Deck not found`);

    const list = deck[listKey as "cards" | "sideboard" | "maybeboard" | "wishlist"] || [];

    const existing = list.find(c => c.cn === cn && c.set === set);
    if (existing) {
      existing.quant += quant;
      existing.updatedAt = new Date();
      existing.proxy = proxy;
      existing.foil = foil;
      existing.tag = Array.from(new Set([...(existing.tag ?? []), ...tag]));
      if (existing.quant < 1) {
        const index = list.indexOf(existing);
        list.splice(index, 1);
      }
    } else {
      list.push({
        name,
        quant,
        set,
        cn,
        foil,
        proxy,
        updatedAt: new Date(),
        image,
        oracle,
        tag,
        color,
        color_identity,
        type,
        cmc,
      });
    }

    await decksCollection.updateOne(
      { _id: ObjectId.createFromHexString(deckId) },
      { $set: { [listKey]: list, lastUpdate: new Date() } }
    );

    return;
  } else {
    throw new Error(`collectionType invalid`);
  }
  
  let foundCard: Card | null = await cardsCollection.findOne({ set, cn, foil, proxy });
  if (foundCard) {
    const newQuant: number = foundCard.quant + quant;
    if (newQuant < 1) {
      await cardsCollection.deleteOne({ _id: foundCard._id });
      return;
    }
    await cardsCollection.updateOne(
      { _id: foundCard._id },
      // update image here to slowly put all of the image URLs with the mongo objects
      { $set: { quant: newQuant, updatedAt: new Date(), image }}
    )
    return;
  }
  await cardsCollection.insertOne({
    name,
    quant,
    set,
    cn,
    foil,
    proxy,
    updatedAt: new Date(),
    image,
    oracle,
    color,
    color_identity,
    type,
    cmc,
  })
}

/**
 * Gets the total quantity of cards in all collections  
 * @returns The total number of cards that are in the database
 */
const countAllCards = async (): Promise<number> => {
  let totalQuant: number = 0;

  const bulkCardsCollection: Collection<Card> = await bulkCards();
  const bulkTotal: Array<Document> = await bulkCardsCollection.aggregate([
    { $group: { _id: null, totalQuant: { $sum: "$quant" } } }
  ]).toArray();
  totalQuant += bulkTotal[0]?.totalQuant || 0;

  const coolCardsCollection: Collection<Card> = await coolCards();
  const coolCardsTotal: Array<Document> = await coolCardsCollection.aggregate([
    { $group: { _id: null, totalQuant: { $sum: "$quant" } } }
  ]).toArray();
  totalQuant += coolCardsTotal[0]?.totalQuant || 0;

  return totalQuant;
}

export default {
  getCardByMongoId, 
  getCardBySetCn,
  getPageOfCardsBulk,
  getOwnedVersionsByName,
  addCard,
  countAllCards,
  getPageOfCards
}
