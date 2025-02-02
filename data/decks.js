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

/**
 *
 * @param {string} deckName The name of the deck to be added
 * @param {string} colorId The color id, in the correct order
 * @param {string} moxfield
 * @param {string} format
 * @param {string} owner
 * @returns An object containing id,
 */
const addDeck = async (deckName, colorId, moxfield, format, owner) => {
  // validate all inputs
  deckName = validation.verifyStr(deckName, `deckName`);
  colorId = validation.verifyColorIdOrdered(colorId);
  try {
    moxfield = validation.verifyMoxfieldLink(moxfield);
  } catch (e) {}
  format = validation.verifyStr(format, `format`);
  owner = validation.verifyStr(owner, `owner`);

  // Fetch decks collection from DB
  const decksCollection = await decks();
  const deckIfFound = await decksCollection.findOne({ moxfield });
  if (deckIfFound)
    throw new Error(`A deck with that moxfield link already exists.`);

  // Create an object for the new deck
  let deckInfo = {
    id: moxfield.split("/").pop(),
    moxfield,
    owner,
    deckName,
    format,
    colorId,
    cards: [],
    changes: [],
    comments: [],
  };

  if (format === "EDH") {
    deckInfo.commander = {};
  }

  // attempt to insert deck
  await decksCollection.insertOne(deckInfo);

  return deckInfo;
};

export default { getAllDecks, getDeckByMoxfieldId, addDeck };
