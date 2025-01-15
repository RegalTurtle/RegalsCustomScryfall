import { cards } from "../config/mongoCollections.js";
import validation from "./validation.js";

const getAllCards = async () => {
  const cardCollection = await cards();
  return await cardCollection.find({}).toArray();
};

const getCardByObjId = async (id) => {
  id = validation.checkId(id);
  const cardCollection = await cards();
  const card = await cardCollection.findOne({ _id: new ObjectId(id) });
  if (!card) throw new Error(`Card not found`);
  return card;
};

const addCard = async (
  name,
  set,
  id,
  cost,
  type,
  text,
  flavor,
  rarity,
  img,
  hasBleedEdge,
  notes,
  tags
) => {
  name = validation.checkName(name);
  set = validation.checkSet(set);
  id = validation.checkId(id);
  cost = validation.checkCost(cost);
  type = validation.checkType(type);
  text = validation.checkText(text);
  flavor = validation.checkText(flavor);
  rarity = validation.checkRarity(rarity);
  img = validation.checkImage(img);
  validation.checkBleedEdge(hasBleedEdge);
  validation.checkNotes(notes);
  validation.checkTags(tags);
};

const getCardByName = async (name) => {
  name = validation.checkName(name);
  const cardCollection = await cards();
  const matchCards = await cardCollection.find({ name: name }).toArray();
  return matchCards;
};

const getCardByCN = async (set, cn) => {
  // Validate inputs
  set = validation.checkSet(set);
  cn = validation.checkCn(cn);
  // Get collection
  const cardCollection = await cards();
  // Match
  const matchCard = await cardCollection.findOne({ set: set, cn: cn });
  // If there is no card, throw an error
  if (!matchCard) {
    throw new Error(`No card found for set ${set} with CN ${cn}`);
  }
  return matchCard;
};

const getCardByCNStr = async (setcn) => {};

const getCardsBySet = async (set) => {
  set = validation.checkSet(set);
  const cardCollection = await cards();
  const cards = await cardCollection.find({ set: set }).toArray();
  return cards;
};

import fs from "fs";
const getAllCardsFromJSON = async () => {
  const data = JSON.parse(fs.readFileSync("customcards.json", "utf8"));
  return data;
};

export default {
  getAllCards,
  getCardByObjId,
  addCard,
  getCardByName,
  getCardByCN,
  getCardByCNStr,
  getCardsBySet,
  getAllCardsFromJSON,
};
