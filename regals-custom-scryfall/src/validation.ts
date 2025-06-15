import authorization from "@/authorization";
import { ObjectId } from "mongodb";
import { CollectionTypeOption, FoilOption } from "./types";

/**
 * Verifies that a given string is a non-empty string, and trims it
 * @param {string} s - a string to be verified
 * @param {string} varName - the name of the variable being tested
 * @returns {string} s, trimmed
 */
const verifyStr = (s: string, varName: string): string => {
  if (typeof s !== "string")
    throw new Error(`${varName} must be a string: it was instead ${typeof s}`);
  s = s.trim();
  if (s.length === 0) throw new Error(`${varName} must be non-empty`);
  return s;
};

/**
 * Verifies that a given username is between 5 and 25 chars and does not have spaces
 * @param {string} username - a string to be verified
 * @returns {string} the given username, trimmed, and made lowercase
 */
const verifyUsername = (username: any): string => {
  username = verifyStr(username, `username`);

  // (?!.*[\s]) - Checks for no spaces
  // .{5,25} - String between 5 and 25 chars
  let usernameRegex = /^(?!.*[\s]).{5,25}$/;
  if (!usernameRegex.test(username))
    throw new Error(
      `Username must be a string without spaces between 5 and 25 characters`
    );
  return username.toLowerCase();
};

/**
 * Verifies that a given password fits the password parameters
 * @param {string} password - password to be checked
 * @returns {string} the given password, trimmed
 */
const verifyPassword = (password: any): string => {
  password = verifyStr(password, `password`);

  // (?=.*[0-9]) at least one number
  // (?=.*[^a-zA-Z\d\s]) at least one not alphanumeric char
  // (?=.*[A-Z]) at least one uppercase
  // (?!.*\s) not at least one space
  // .{12,} - 12 or more characters
  let passwordRegex =
    /^(?=.*[0-9])(?=.*[^a-zA-Z\d\s])(?=.*[A-Z])(?!.*\s).{12,}$/;
  if (!passwordRegex.test(password))
    throw new Error(
      `Password must be more than 12 characters, have a number, special character, and an uppercase.`
    );

  return password;
};

/**
 * Verifies an email to be an actual email
 * @param {string} email - email to be checked
 * @returns {string} the given email, trimmed
 */
const verifyEmail = (email: string): string => {
  email = verifyStr(email, `email`);

  // ^ - Start of string
  // .+ - Some characters
  // @
  // .+ - Some characters
  // \. - A period
  // .+ - Some characters
  // $ - End string
  let emailRegex = /^.+@.+\..+$/;
  if (!emailRegex.test(email))
    throw new Error(`Email must be a string with an @ and a .`);

  return email;
};

/**
 * Takes a string and verifies that it is a permission level, and trims it
 * @param {string} permissionLevel Given a string, makes sure that it is a valid permission level
 * @returns The given permission level, trimmed
 */
const verifyPermissionLevel = (permissionLevel: string): string => {
  const permissionLevels = authorization.permissionLevels;

  permissionLevel = verifyStr(permissionLevel, `permissionLevel`);
  // cast all permissionLevels to lowercase
  permissionLevel = permissionLevel.toLowerCase();

  if (!permissionLevels.includes(permissionLevel))
    throw new Error(
      `permissionLevel must be one of the defined permission levels`
    );
  return permissionLevel;
};

/**
 * Verifies that a given string is a correctly-ordered color identity (i.e. clockwise around the mana circle, shortest path)
 * @param {string} idString
 * @returns the idString, uppercase, and trimmed
 */
const verifyColorIdOrdered = (idString: string): string => {
  const validColorIds = [
    "C",
    "W",
    "U",
    "B",
    "R",
    "G",
    "WU",
    "UB",
    "BR",
    "RG",
    "GW",
    "WB",
    "UR",
    "BG",
    "RW",
    "GU",
    "WUB",
    "UBR",
    "BRG",
    "RGW",
    "GWU",
    "RWB",
    "GUR",
    "WBG",
    "URW",
    "BGU",
    "UBRG",
    "BRGW",
    "RGWU",
    "GWUB",
    "WUBR",
    "WUBRG",
  ];

  idString = verifyStr(idString, `idString`).toUpperCase();
  if (validColorIds.includes(idString)) {
    return idString;
  } else {
    throw new Error(`idString must be a valid colorId`);
  }
};

/**
 * Takes a string and verifies that it is a moxfield link
 * @param {string} moxfieldLink The link to the deck on Moxfield
 * @returns The moxfield link, trimmed
 */
const verifyMoxfieldLink = (moxfieldLink: string): string => {
  const beginningOfLink = "https://moxfield.com/decks/";
  moxfieldLink = verifyStr(moxfieldLink, `moxfieldLink`);
  if (
    !moxfieldLink.startsWith(beginningOfLink) ||
    moxfieldLink.length <= beginningOfLink.length
  )
    throw new Error(`Link must be a valid Moxfield link`);
  return moxfieldLink;
};

/**
 * Takes a string and verifies that it is either true or false
 * @param {string} b The string to check if it's a boolean
 * @returns A boolean, either true or false depending on the input
 */
const verifyStringToBool = (b: string): boolean => {
  b = verifyStr(b, `b`).toLowerCase();
  if (b === "true") return true;
  if (b === "false") return false;
  throw new Error(`b was neither true nor false`);
};

/**
 * Takes in a string and verifies that it is an integer, then returns the string representation of the integer
 * @param {string} i The string representation of an integer
 * @returns `i`, trimmed
 */
const verifyIntegerAsString = (i: string): string => {
  i = verifyStr(i, `i`);

  const integerRegex = /^-?\d+$/;
  if (!integerRegex.test(i)) {
    throw new Error(`Invalid integer string: "${i}"`);
  }

  return i;
};

/**
 * Verifies that a given string is a date string of the form YYYYMMDD
 * @param {string} date A date string in the format YYYYMMDD
 * @returns The date string, trimmed
 */
const verifyDate = (date: string): string => {
  date = verifyStr(date, `date`);

  // Check if the string matches the YYYYMMDD format
  const regex = /^\d{4}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$/;
  if (!regex.test(date)) {
    throw new Error(`Date string in incorrect format`);
  }

  // Extract year, month, and day from the string
  const year = parseInt(date.substring(0, 4), 10);
  const month = parseInt(date.substring(4, 6), 10);
  const day = parseInt(date.substring(6, 8), 10);

  // Check for valid days in the month
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth)
    throw new Error(`There aren't that many days in month ${month}`);
  return date;
};

type player = {
  name?: string,
  deck?: string
}

/**
 * Verifies that a given object is a player object with one or more fields
 * @param {string} player A player object containing one or more of the allowed keys
 * @returns The `player` object
 */
const verifyPlayer = (player: player): player => {
  const possibleFields = ["name", "deck"];

  if (typeof player !== "object") throw new Error(`Player must be an object`);
  if (Object.keys(player).length === 0)
    throw new Error(`Player must not be empty`);
  for (const key in player) {
    if (!possibleFields.includes(key))
      throw new Error(`Each key must be valid`);
  }
  return player;
};

/**
 * Verifies that `b` is a boolean
 * @param {boolean} b a boolean
 * @param {string} type what `b` is used for
 * @returns `b`
 */
const verifyBool = (b: boolean, type: string): boolean => {
  if (typeof b !== "boolean") throw new Error(`${type} must be a boolean`);
  return b;
};

/**
 * Takes the string representation of a Mongo ID and returns the Mongo ObjectId object
 * @param id String representation of a Mongo ID
 * @returns The Mongo object of the id
 */
const verifyMongoId = (id: string): ObjectId => {
  id = verifyStr(id, `id`);
  if (!ObjectId.isValid(id)) throw new Error(`id is invalid`);
  return ObjectId.createFromHexString(id);
}

const verifyInteger = (num: number, type: string): number => {
  if (typeof num !== "number") throw new Error(`${type} must be a number`);
  if (isNaN(num)) throw new Error(`${type} must not be NaN`);
  if (!Number.isInteger) throw new Error(`${type} must be an integer`);
  return num;
}

const verifyFoilType = (foil: string): FoilOption => {
  foil = foil.trim();
  if (foil !== "nonfoil" && foil !== "foil" && foil !== "etched") throw new Error(`Foil type must either be nonfoil, foil, or etched`);
  return foil;
}

const verifyCollectionType = (collectionType: string): CollectionTypeOption => {
  collectionType = collectionType.trim();
  if (collectionType !== "bulk" && collectionType !== "cool-cards" && collectionType !== "trade-binder") throw new Error(`collectionType must be either bulk, cool-cards, or trade-binder`);
  return collectionType;
}

export default {
  verifyStr,
  verifyUsername,
  verifyPassword,
  verifyEmail,
  verifyPermissionLevel,
  verifyColorIdOrdered,
  verifyMoxfieldLink,
  verifyStringToBool,
  verifyDate,
  verifyIntegerAsString,
  verifyPlayer,
  verifyBool,
  verifyMongoId,
  verifyInteger,
  verifyFoilType,
  verifyCollectionType,
};
