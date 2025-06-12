import { cards } from "@/config/mongoCollections";
import validation from "@/validation";
import { AggregationCursor, Collection, Document, ObjectId } from "mongodb";
import { Card, FoilOption } from "@/types";

/**
 * Given a string representation of an ObjectId, finds that card in the database
 * @param id The string representation of the ObjectId
 * @returns A card object, or throws an error if the card isn't found
 */
const getCardByMongoId = async (id: string): Promise<Card> => {
  const _id: ObjectId = validation.verifyMongoId(id);
  
  const cardCollection: Collection<Card> = await cards();
  let card: Card | null = await cardCollection.findOne({ _id });

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

  const cardCollection: Collection<Card> = await cards();
  let card: Card | null = await cardCollection.findOne({ set, cn, foil: foilOption });

  if (!card) throw new Error(`Card not found`);

  return card;
}

/**
 * Gets a page of card objects, sorted from most recently changed to least recently changed
 * @param page Page number to navigate to
 * @returns An array of 20 card objects
 */
const getAllCards = async (page: number): Promise<Array<Card>> => {
  const cardCollection: Collection<Card> = await cards();
  let allCards: Array<Card> = await cardCollection.find().sort({ updatedAt: -1 }).skip((page-1)*20).limit(20).toArray();
  
  return allCards;
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
  
  const cardCollection: Collection<Card> = await cards();
  let foundCard: Card | null = await cardCollection.findOne({ set, cn, foil, proxy });
  if (foundCard) {
    const newQuant: number = foundCard.quant + quant;
    if (newQuant < 1) {
      await cardCollection.deleteOne({ _id: foundCard._id });
      return;
    }
    await cardCollection.updateOne(
      { _id: foundCard._id },
      // update image here to slowly put all of the image URLs with the mongo objects
      { $set: { quant: newQuant, updatedAt: new Date(), image }}
    )
    return;
  }
  await cardCollection.insertOne({
    name,
    quant,
    set,
    cn,
    foil,
    proxy,
    decks: [],
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
  const cardCollection: Collection<Card> = await cards();

  const total: Array<Document> = await cardCollection.aggregate([
    { $group: { _id: null, totalQuant: { $sum: "$quant" } } }
  ]).toArray();

  const totalQuant: number = total[0]?.totalQuant || 0;

  return totalQuant;
}

export default {
  getCardByMongoId, 
  getCardBySetCn,
  getAllCards,
  addCard,
  countAllCards
}