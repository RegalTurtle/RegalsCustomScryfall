import { Router } from "express";
import fs from "fs";
import deckData from "../../data/decks.js";
import xss from "xss";
const router = Router();

router.route("/").get(async (req, res) => {
  try {
    const decks = await deckData.getAllDecks();

    return res.render(`pages/decks/deckList.ejs`, { decks });
  } catch (e) {
    return res.status(500).json({ error: e, location: "deckList / get" });
  }
});

router.route("/:id/").get(async (req, res) => {
  let id = xss(req.params.id);

  let deck;
  try {
    deck = await deckData.getDeckByMoxfieldId(id);
  } catch (e) {
    return res.status(400).json({ error: e, location: "deckList /:id GET" });
  }

  return res.render(`pages/decks/deck.ejs`, { deck });
});

export default router;
