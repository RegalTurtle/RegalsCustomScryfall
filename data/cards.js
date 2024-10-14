import { cards } from "../config/mongoCollections.js";
import { objectId } from "mongodb";
import validation from "./validation.js"

const exportedMethods = {
  async getAllCards() {
    const cardCollection = await cards();
    return await cardCollection.find({}).toArray();
  },
  async getCardByObjId(id) {
    id = validation.checkId(id);
    const cardCollection = await cards();
    const card = await cardCollection.findOne({_id: new ObjectId(id)});
    if (!card) throw new Error(`Card not found`);
    return card;
  },
  async addCard(name, set, id, cost, type, text, flavor, rarity, img, hasBleedEdge, notes, tags) {
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
  },
  async getCardByName(name) {
    name = validation.checkName(name);
    const cardCollection = await cards();
    const matchCards = await cardCollection.find({name: name}).toArray();
    return matchCards;
  },
  async getCardByCN(set, cn) {
    set = validation.checkSet(set);
    cn = validation.checkCn(cn);
    const cardCollection = await cards();
    const matchCards = await cardCollection.find({set: set, cn: cn}).toArray();
    return matchCards;
  },
  async getCardByCNStr(setcn) {
  },
  async getCardsBySet(set) {
    set = validation.checkSet(set);
    const cardCollection = await cards();
    const cards = await cardCollection.find({ set: set }).toArray();
    return cards;
  }
};

export default exportedMethods;
