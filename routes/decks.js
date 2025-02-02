import { Router } from "express";
import deckData from "../data/decks.js";
import gameData from "../data/games.js";
import xss from "xss";
import validation from "../validation.js";
import authorization from "../authorization.js";
const router = Router();

router.route("/").get(async (req, res) => {
  try {
    const decks = await deckData.getAllDecks();

    return res.render(`pages/decks/deckList`, {
      decks,
      canAddDecks: authorization.canAddDecks(
        req.session.userInfo?.permissionLevel
      ),
    });
  } catch (e) {
    return res.status(500).json({ error: e, location: "deckList / get" });
  }
});

router
  .route("/add-deck")
  .get(authorization.mwCanAddDecks, async (req, res) => {
    return res.render(`pages/decks/addDeck.ejs`, {
      formData: undefined,
      errors: undefined,
    });
  })
  .post(authorization.mwCanAddDecks, async (req, res) => {
    let { deckName, colorId, moxfield, format, owner } = req.body;
    // XSS checking, for cross-site scripting
    deckName = xss(deckName);
    colorId = xss(colorId);
    moxfield = xss(moxfield);
    format = xss(format);
    owner = xss(owner);

    // go into error checking, collect all errors
    let errors = [];
    try {
      deckName = validation.verifyStr(deckName, `deckName`);
    } catch (e) {
      errors.push(e);
    }
    try {
      colorId = validation.verifyColorIdOrdered(colorId, `colorId`);
    } catch (e) {
      errors.push(e);
    }
    try {
      moxfield = validation.verifyMoxfieldLink(moxfield, `moxfield`);
    } catch (e) {
      // pass
    }
    try {
      format = validation.verifyStr(format, `format`);
    } catch (e) {
      errors.push(e);
    }
    try {
      owner = validation.verifyStr(owner, `owner`);
    } catch (e) {
      errors.push(e);
    }

    // if there are errors, re-render the page
    if (errors.length > 0) {
      return res.status(400).render("pages/decks/addDeck", {
        errors,
        formData: { deckName, colorId, moxfield, format, owner },
      });
    }

    // if no errors, try to input deck
    let deck;
    try {
      deck = await deckData.addDeck(deckName, colorId, moxfield, format, owner);
    } catch (e) {
      return res.status(500).render("pages/decks/addDeck", {
        errors: [e],
        formData: { deckName, colorId, moxfield, format, owner },
      });
    }

    if (!deck)
      return res.status(500).render("pages/decks/addDeck", {
        errors: [e],
        formData: { deckName, colorId, moxfield, format, owner },
      });

    return res.redirect(`/decks/${deck.id}`);
  });

router
  .route("/:id/")
  .get(async (req, res) => {
    let id = xss(req.params.id);

    let deck;
    try {
      deck = await deckData.getDeckByMoxfieldId(id);
    } catch (e) {
      return res.status(400).json({ error: e, location: "GET /decks/:id/" });
    }

    let games;
    try {
      games = await gameData.getGamesByDeckMoxfieldId(id);
    } catch (e) {
      return res.status(400).json({ error: e, location: "GET /decks/:id/" });
    }
    let won = games.filter((game) => game.win);

    return res.render(`pages/decks/deck`, {
      deck,
      errors: undefined,
      formData: undefined,
      canAddGames: authorization.canAddGames(
        req.session.userInfo?.permissionLevel
      ),
      canAddDecks: authorization.canAddDecks(
        req.session.userInfo?.permissionLevel
      ),
      games,
      gamesWon: won,
    });
  })
  .post(authorization.mwCanAddGames, async (req, res) => {
    // get the deck as per the id in the url
    let id = xss(req.params.id);

    let deck;
    try {
      deck = await deckData.getDeckByMoxfieldId(id);
    } catch (e) {
      return res.status(400).json({ error: e, location: "POST /decks/:id/" });
    }

    let games;
    try {
      games = await gameData.getGamesByDeckMoxfieldId(id);
    } catch (e) {
      return res.status(400).json({ error: e, location: "POST /decks/:id/" });
    }
    let won = games.filter((game) => game.win);

    // parse the req for the form data
    let { winLose } = req.body;
    // XSS checking, for cross-site scripting
    winLose = xss(winLose);

    // validate inputs
    let errors = [];
    try {
      winLose = validation.verifyStringToBool(winLose);
    } catch (e) {
      errors.push(e);
    }

    // if there are errors, re-render the page
    if (errors.length > 0) {
      return res.status(400).render(`pages/decks/deck`, {
        deck,
        errors,
        formData: undefined,
        canAddGames: authorization.canAddGames(
          req.session.userInfo?.permissionLevel
        ),
      	canAddDecks: authorization.canAddDecks(
      		req.session.userInfo?.permissionLevel
      	),
        games,
        gamesWon: won,
      });
    }

    // if no errors, try to input game
    let game;
    try {
      game = await gameData.addGame(deck.id, winLose, {});
    } catch (e) {
      return res.status(500).render("pages/decks/deck", {
        deck,
        errors,
        formData: undefined,
        canAddGames: authorization.canAddGames(
          req.session.userInfo?.permissionLevel
        ),
      	canAddDecks: authorization.canAddDecks(
      		req.session.userInfo?.permissionLevel
      	),
        games,
        gamesWon: won,
      });
    }

    return res.redirect(`/decks/${id}/`);
  });

export default router;
