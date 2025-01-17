import { games } from "../config/mongoCollections.js";
import validation from "../validation.js";
import helpers from "../helpers.js";

/**
 * Gets all games from database
 * @returns An array of all games in the database
 */
const getAllGames = async () => {
  const gameCollection = await games();
  return await gameCollection.find({}).toArray();
};

const addGame = async (deckId, win, otherData) => {
  // unwrap data
  let { gameDate, players, otherPlayers } = otherData;

  // verify all values
  deckId = validation.verifyStr(deckId, `deckId`);
  win = validation.verifyStringToBool(win);
  // trimming this here in case there is a value with just spaces, we want that to be treated as an empty date string
  gameDate = gameDate.trim();
  if (gameDate) {
    gameDate = validation.verifyDate(gameDate);
  } else {
    gameDate = helpers.getCurrentDateYYYYMMDD();
  }

  // create a game object
  let game = { deckId, gameDate, players, win, otherPlayers };
};

export default { getAllGames };
