import { Router } from "express";
const router = Router();
import fs from "fs";

router.route("/").get(async (req, res) => {
  try {
    const decks = JSON.parse(fs.readFileSync("decks.json", "utf8"));

    return res.render(`pages/decks/deckList.ejs`, { decks });
  } catch (e) {
    return res.status(500).json({ error: e, location: "deckList / get" });
  }
});

export default router;
