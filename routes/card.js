import { Router } from "express";
const router = Router();
import cardData from "../data/cards.js";
import validation from "../data/validation.js";
import fs from "fs";

router.route("/:setcn").patch(async (req, res) => {
  // get the user name and comment
  let userName = req.body.name;
  let userComment = req.body.comment;
  // clean the inputs
  try {
    userName = validation.checkStr(userName, "username");
    userComment = validation.checkStr(userComment, "comment");
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  // if the user isn't one of the three of us, don't continue
  if (!["Thys", "Sam", "Kenneth"].includes(userName)) {
    return res.status(302).redirect(`/card/${req.params.setcn}`);
  }
  // get the set code
  let setcn = req.params.setcn;
  let [set, cn] = setcn.split("_");
  try {
    set = validation.checkSet(set);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  try {
    cn = Number(cn);
    cn = validation.checkCn(cn);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  try {
    const data = JSON.parse(fs.readFileSync("customcards.json", "utf8"));
    // get the card in question's json entry
    const entry = data.find((item) => item.set === set && item.cn === cn);

    if (!entry) {
      return res.status(404).json({ error: "Entry not found" });
    }
    // if there isnt a notes yet, make a blank list
    if (!entry.notes) {
      entry.notes = [];
    }
    // get today's date, formatted
    // made by chatgpt, idk what's going on here
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, "0")}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${today.getFullYear()}`;
    // add the new note to the json
    entry.notes.push({
      date: formattedDate,
      creator: userName,
      notes: userComment,
    });

    fs.writeFileSync("customcards.json", JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Error writing to JSON file:", e);
    return res.status(500).json({ message: "Failed to write data to file" });
  }

  return res.status(302).redirect(`/card/${setcn}`);
});

router.route("/:set/:cn").get(async (req, res) => {
  // Get all values
  let set = req.params.set;
  let cn = req.params.cn;
  // Verify all values
  try {
    set = validation.checkSet(set);
    cn = Number(cn);
    cn = validation.checkCn(cn);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  // find the card
  try {
    const data = JSON.parse(fs.readFileSync("customcards.json", "utf8"));
    const cardData = data.find((item) => item.set === set && item.cn === cn);

    if (!cardData) return res.status(404).json({ error: "Card not found" });

    res.status(200).render(`pages/card`, { card: cardData });
  } catch (e) {
    return res.status(500).json({ error: e });
  }
});

export default router;
