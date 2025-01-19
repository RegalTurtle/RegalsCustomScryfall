import { Router } from "express";
import validation from "../data/validation.js";
import validation2 from "../validation.js";
import helpers from "../helpers.js";
import fs from "fs";
import customCardData from "../data/customCards.js";
import xss from "xss";
const router = Router();

router.route("/").get(async (req, res) => {
  return res.render("pages/custom/searchHome");
});

router
  .route("/card/:set/:cn")
  .get(async (req, res) => {
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

      res.status(200).render(`pages/custom/card`, { card: cardData });
    } catch (e) {
      return res.status(500).json({ error: e });
    }
  })
  .patch(async (req, res) => {
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
      return res
        .status(302)
        .redirect(`/card/${req.params.set}/${req.params.cn}`);
    }
    // get the set code
    let set = req.params.set;
    let cn = req.params.cn;
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
      const formattedDate = `${String(today.getDate()).padStart(
        2,
        "0"
      )}-${String(today.getMonth() + 1).padStart(
        2,
        "0"
      )}-${today.getFullYear()}`;
      // add the new note to the json
      entry.notes.push({
        date: formattedDate,
        creator: userName,
        notes: userComment,
      });

      fs.writeFileSync(
        "customcards.json",
        JSON.stringify(data, null, 2),
        "utf8"
      );
    } catch (e) {
      console.error("Error writing to JSON file:", e);
      return res.status(500).json({ message: "Failed to write data to file" });
    }

    return res.status(302).redirect(`/custom/card/${set}/${cn}`);
  });

router.route("/search/:searchTerms").get(async (req, res) => {
  let searchTerms = xss(req.params.searchTerms);

  // error check the params
  try {
    searchTerms = validation2.verifyStr(searchTerms, `searchTerms`);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  // parse the param list into different params

  // is essentially a split that tokenizes the string, but not if it's inside of quotes
  // Regex Breakdown:
  // (?: ... ) is a non-capturing group.
  // [^\s"]+ matches sequences of characters that are not spaces or quotes.
  // "[^"]*" matches sequences enclosed in quotes.
  var params = searchTerms.toLowerCase().match(/(?:[^\s"]+|"[^"]*")+/g);

  let jsonData = await customCardData.getAllCardsFromJSON();

  let order_cmc = false;
  let see_invis = false;

  // then filter the cards based on the search criteria
  let jsonDataFiltered = jsonData.filter((card) => {
    // need to loop through all search parameters
    for (let i = 0; i < params.length; i++) {
      // this strips quotes off of the search, so that it's not searching for the quote char, since it will never be there
      let cur_param = params[i].replace(/"/g, "");
      if (cur_param == "order:cmc") {
        order_cmc = true;
        continue;
      }
      if (cur_param == "show:all") {
        see_invis = true;
        continue;
      }
      // checks to see if the current search term is a type check
      if (cur_param.slice(0, 2) == "t:") {
        // if the types match, continue with next param
        if (card["type"].toLowerCase().includes(cur_param.slice(2))) {
          continue;
          // else, return false and break now
        } else {
          return false;
        }
      }
      // same as type checking but for sets
      if (cur_param.slice(0, 2) == "s:") {
        if (card["set"].toLowerCase() == cur_param.slice(2)) {
          continue;
        } else {
          return false;
        }
      }
      if (cur_param.slice(0, 3) == "id:") {
        if (
          helpers.containsAllCharacters(
            card["id"].toLowerCase(),
            cur_param.slice(3)
          )
        ) {
          continue;
        } else {
          return false;
        }
      }
      if (cur_param.slice(0, 2) == "c=") {
        if (
          helpers.haveSameCharacters(
            helpers.getColorsFromObj(card),
            cur_param.slice(2)
          )
        ) {
          continue;
        } else {
          return false;
        }
      }
      if (cur_param.slice(0, 3) == "c>=") {
        if (
          helpers.containsAllCharacters(
            cur_param.slice(3),
            helpers.getColorsFromObj(card)
          )
        ) {
          continue;
        } else {
          return false;
        }
      }
      if (cur_param.slice(0, 3) == "c<=") {
        if (
          helpers.containsAllCharacters(
            helpers.getColorsFromObj(card),
            cur_param.slice(3)
          )
        ) {
          continue;
        } else {
          return false;
        }
      }
      if (cur_param.slice(0, 2) == "r=") {
        if (cur_param.slice(2) == card["rarity"].toLowerCase()) {
          continue;
        } else {
          return false;
        }
      }
      if (cur_param.slice(0, 3) == "cn=") {
        if (cur_param.slice(3) == card["cn"]) {
          continue;
        } else {
          return false;
        }
      }
      if (cur_param.slice(0, 2) == "o:") {
        if (card["text"].toLowerCase().includes(cur_param.slice(2))) {
          continue;
        } else {
          return false;
        }
      }
      if (cur_param == "is:reprint") {
        if (card["tags"] && card["tags"]["reprint"]) {
          continue;
        } else {
          return false;
        }
      }
      if (cur_param == "not:reprint") {
        if (typeof card["tags"] !== "undefined" && !card["tags"]["reprint"]) {
          continue;
        } else {
          return false;
        }
      }
      if (cur_param.slice(0, 4) == "cmc=") {
        if (helpers.calculateManaValue(card["cost"]) == cur_param.slice(4)) {
          continue;
        } else {
          return false;
        }
      }
      if (cur_param.slice(0, 4) == "cmc>") {
        if (helpers.calculateManaValue(card["cost"]) > cur_param.slice(4)) {
          continue;
        } else {
          return false;
        }
      }
      if (cur_param.slice(0, 4) == "cmc<") {
        if (helpers.calculateManaValue(card["cost"]) < cur_param.slice(4)) {
          continue;
        } else {
          return false;
        }
      }
      if (cur_param.slice(0, 9) == "function:") {
        if (
          card["tags"] &&
          card["tags"]["function"] &&
          card["tags"]["function"].includes(cur_param.slice(9))
        ) {
          continue;
        } else {
          return false;
        }
      }
      if (cur_param == "has:bleed") {
        if (card["has_bleed_edge"]) {
          continue;
        } else {
          return false;
        }
      }
      if (cur_param == "-has:bleed") {
        if (card["has_bleed_edge"]) {
          return false;
        } else {
          continue;
        }
      }
      // if all other checks fail, turn it into a name check
      if (
        card["name"].toLowerCase().includes(cur_param) ||
        (card["nickname"] && card["nickname"].toLowerCase().includes(cur_param))
      ) {
        continue;
      } else {
        return false;
      }
      // fail-safe, nothing should ever reach here though, it should all be caught above
      return false;
    }
    // if the loop goes off without triggering a return false, then the card matches, return true
    return true;
  });

  // object.sort
  jsonDataFiltered.sort((a, b) => {
    if (a["set"].localeCompare(b["set"]) == 0) {
      return a["cn"] - b["cn"];
    }
    return a["set"].localeCompare(b["set"]);
  });
  if (order_cmc) {
    jsonDataFiltered.sort((a, b) => {
      return (
        helpers.calculateManaValue(a["cost"]) -
        helpers.calculateManaValue(b["cost"])
      );
    });
  }

  return res.render(`pages/custom/searchResults`, {
    jsonDataFiltered,
    searchTerms,
  });
});

router.route("/search/").post(async (req, res) => {
  // get the parameters
  let searchTerms = xss(req.body.searchTerms);

  return res.redirect(`/custom/search/${searchTerms}`);
});

export default router;
