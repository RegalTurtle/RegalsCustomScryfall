import { decks } from "../config/mongoCollections.js";
import validation from "../validation.js";

/**
 * Gets all decks from database
 * @returns An array of all decks in the database
 */
const getAllDecks = async () => {
  const deckCollection = await decks();
  return await deckCollection.find({}).toArray();
};

/**
 * Given a moxfield Id, gets the deck data corresponding to that moxfield Id
 * @param {string} moxfieldId the Id to search for
 * @returns An object of a deck
 */
const getDeckByMoxfieldId = async (moxfieldId) => {
  moxfieldId = validation.verifyStr(moxfieldId, `moxfieldId`);

  const deckCollection = await decks();
  let deckFound = await deckCollection.findOne({ id: moxfieldId });
  if (!deckFound) throw new Error(`Deck not found`);
  return deckFound;
};

export default { getAllDecks, getDeckByMoxfieldId };
