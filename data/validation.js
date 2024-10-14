import { ObjectId } from "mongodb";
import { colors, rarities } from "../helpers.js";

const checkStr = (str, type) => {
  if (!str) throw new Error(`Error: ${type} must be provided`);
  if (typeof str !== "string") throw new Error(`Error: ${type} must be a string`);
  str = str.trim();
  if (str.length === 0) throw new Error(`Error: ${type} must not be empty string`);
  return str;
}

const checkStrLoose = (str, type) => {
  if (!str) throw new Error(`Error: ${type} must be provided`);
  if (typeof str !== 'string') throw new Error(`Error: ${type} must be a string`);
  str = str.trim;
  return str;
}

const checkObj = (obj, type) => {
  if (!obj) throw new Error(`Error: ${type} must exist`);
  if (typeof obj !== "object) throw new Error(`Error: ${type} must be an object`);
}

const exportedMethods = {
  checkObjId(id) {
    id = checkStr(id, "object id");
    if (!ObjectId.isValid(id)) throw new Error(`Error: id must be valid ObjectId`);
    return id;
  },
  checkCn(cn) {
    if (!cn) throw new Error(`Error: cn must exist`);
    if (typeof cn !== "number") throw new Error(`Error: cn must be a number`);
    if (!Number.isInteger(cn)) throw new Error(`Error: cn must be an integer`);
    if (isNan(cn) || !isFinite(cn)) throw new Error(`Error: cn cannot be NaN or Infinite`);
  },
  checkSet(set) {
    set = checkStr(set, "set");
    return set;
  },
  checkName(name) {
    name = checkStr(name, "name");
    return name;
  },
  checkId(id) {
    id = checkStr(id, "id").toUpperCase();
    if (!id.every((ch) => {
      return colors.includes(ch)
    })) throw new Error(`Error: colors not within magic colors`);
    return id;
  },
  checkCost(cost) {
    cost = checkStr(cost);
    // TODO: probably needs some additional checks
    return cost;
  },
  checkType(type) {
    type = checkStr(type, "type");
    // TODO: Maybe some error checking with valid types
    return type;
  },
  checkText(text) {
    text = checkStrLoose(text, "text");
    return text;
  },
  checkFlavor(flavor) {
    flavor = checkStrLoose(flavor, "flavor");
    return flavor;
  },
  checkRarity(r) {
    r = checkStr(r, "rarity").toUpperCase;
    if (!rarities.includes(r)) throw new Error(`Error: rarity must be a proper rarity`);
    return r;
  },
  checkImage(i) {
    i = checkStr(i, "image");
    // TODO: probably add some checks to make sure the string is correct, and maybe fix to have the /i/
    return i;
  },
  checkBleedEdge(bleed) {
    if (typeof bleed !== "boolean") throw new Error(`Error: hasBleedEdge must be a boolean`);
  },
  checkNotes(notes) {
    checkObj(notes, "notes");
    // TODO: more process on the notes object
  },
  checkTags(tags) {
    checkObj(tags, "tags");
    // TODO: more processing on the tags object
  }
};

export default exportedMethods;
