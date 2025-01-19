import { games } from "../config/mongoCollections.js";
import validation from "../validation.js";
import helpers from "../helpers.js";
import deckData from "./decks.js";

/**
 * Gets all games from database
 * @returns An array of all games in the database
 */
const getAllGames = async () => {
  const gameCollection = await games();
  return await gameCollection.find({}).toArray();
};

/**
 * Inserts a game into the database
 * @param {string} deckId The id of the deck played in the game
 * @param {boolean} win if I won the game
 * @param {object} otherData An object that may contain `gameDate`, `players`, and/or `otherPlayers`
 * @returns the object that represents the game
 */
const addGame = async (deckId, win, otherData) => {
  // unwrap data
  let { gameDate, players, otherPlayers } = otherData;

  // verify all required values
  deckId = validation.verifyStr(deckId, `deckId`);
  let deck = await deckData.getDeckByMoxfieldId(deckId);
  win = validation.verifyBool(win);

  // trimming this here in case there is a value with just spaces, we want that to be treated as an empty date string
  if (gameDate) {
    gameDate = validation.verifyDate(gameDate);
  } else {
    gameDate = helpers.getCurrentDateYYYYMMDD();
  }

  // create a game object
  let game = { deckId, win, gameDate, format: deck.format };

  try {
    game.players = validation.verifyIntegerAsString(players);
  } catch (e) {}

  if (Array.isArray(otherPlayers)) {
    game.otherPlayers = otherPlayers.map(validation.verifyPlayer);
    if (!game.players) {
      game.players = game.otherPlayers.length;
    }
  }

  const gameCollection = await games();
  await gameCollection.insertOne(game);

  return game;
};

/**
 * Gets all of the games for a moxfield id
 * @param {string} moxfieldId Moxfield-based id for a deck
 * @returns An array with all of the games for that deck
 */
const getGamesByDeckMoxfieldId = async (moxfieldId) => {
  // Verify that a deck with that ID exists
  const deck = await deckData.getDeckByMoxfieldId(moxfieldId);
  if (!deck) throw new Error("Deck not found");

  // Get the games collection
  const gameCollection = await games();

  // Find games by moxfieldId
  const gamesList = await gameCollection.find({ deckId: moxfieldId }).toArray();
  return gamesList;
};

export default { getAllGames, addGame, getGamesByDeckMoxfieldId };
