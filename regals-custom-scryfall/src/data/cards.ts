import { bulkCards } from "@/config/mongoCollections";
import validation from "@/validation";
import { Collection, Document, ObjectId } from "mongodb";
import { Card, FoilOption } from "@/types";

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
  name: string, 
  quant: number, 
  set: string, 
  cn: string, 
  foil: FoilOption, 
  proxy: boolean, 
  image: string,
  oracle: string,
): Promise<undefined> => {
  name = validation.verifyStr(name, `name`);
  quant = validation.verifyInteger(quant, `quant`);
  set = validation.verifyStr(set, `set`);
  cn = validation.verifyStr(cn, `cn`);
  foil = validation.verifyFoilType(foil);
  proxy = validation.verifyBool(proxy, `proxy`);
  image = validation.verifyStr(image, `image`);
  if (typeof oracle !== "string") throw new Error("oracle must be a string");
  
  const bulkCardsCollection: Collection<Card> = await bulkCards();
  let foundCard: Card | null = await bulkCardsCollection.findOne({ set, cn, foil, proxy });
  if (foundCard) {
    const newQuant: number = foundCard.quant + quant;
    if (newQuant < 1) {
      await bulkCardsCollection.deleteOne({ _id: foundCard._id });
      return;
    }
    await bulkCardsCollection.updateOne(
      { _id: foundCard._id },
      // update image here to slowly put all of the image URLs with the mongo objects
      { $set: { quant: newQuant, updatedAt: new Date(), image }}
    )
    return;
  }
  await bulkCardsCollection.insertOne({
    name,
    quant,
    set,
    cn,
    foil,
    proxy,
    locations: [],
    updatedAt: new Date(),
    image,
    oracle,
  })
}

/**
 * Gets the total quantity of cards in the collection
 * @returns The total number of cards that are in the database
 */
const countAllCards = async (): Promise<number> => {
  const bulkCardsCollection: Collection<Card> = await bulkCards();

  const total: Array<Document> = await bulkCardsCollection.aggregate([
    { $group: { _id: null, totalQuant: { $sum: "$quant" } } }
  ]).toArray();

  const totalQuant: number = total[0]?.totalQuant || 0;

  return totalQuant;
}

export default {
  getCardByMongoId, 
  getCardBySetCn,
  getPageOfCardsBulk,
  addCard,
  countAllCards
}