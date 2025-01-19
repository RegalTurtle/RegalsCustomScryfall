import authorization from "./authorization.js";

/**
 * Verifies that a given string is a non-empty string, and trims it
 * @param {string} s - a string to be verified
 * @param {string} varName - the name of the variable being tested
 * @returns {string} s, trimmed
 */
const verifyStr = (s, varName) => {
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
const verifyUsername = (username) => {
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
const verifyPassword = (password) => {
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
const verifyEmail = (email) => {
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
 * Takes a string and vefiries that it is a permission level, and trims it
 * @param {string} permissionLevel Given a string, makes sure that it is a valid permission level
 * @returns The given permission level, trimmed
 */
const verifyPermissionLevel = (permissionLevel) => {
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
const verifyColorIdOrdered = (idString) => {
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
 * @param {string} moxfieldLink
 * @returns The moxfield link, trimmed
 */
const verifyMoxfieldLink = (moxfieldLink) => {
  const beginningOfLink = "https://moxfield.com/decks/";
  moxfieldLink = verifyStr(moxfieldLink);
  if (
    !moxfieldLink.startsWith(beginningOfLink) ||
    moxfieldLink.length <= beginningOfLink.length
  )
    throw new Error(`Link must be a valid Moxfield link`);
  return moxfieldLink;
};

/**
 * Takes a string and verifies that it is either true or false
 * @param {string} b
 * @returns A boolean, either true or false depending on the input
 */
const verifyStringToBool = (b) => {
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
const verifyIntegerAsString = (i) => {
  i = verifyStr(i, `i`);

  const integerRegex = /^-?\d+$/;
  if (!integerRegex.test(str)) {
    throw new Error(`Invalid integer string: "${str}"`);
  }

  return i;
};

/**
 * Verifies that a given string is a date string of the form YYYYMMDD
 * @param {string} date A date string in the format YYYYMMDD
 * @returns The date string, trimmed
 */
const verifyDate = (date) => {
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

/**
 * Verifies that a given object is a player object with one or more fields
 * @param {string} player A player object containing one or more of the allowed keys
 * @returns The `player` object
 */
const verifyPlayer = (player) => {
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
const verifyBool = (b, type) => {
  if (typeof b !== "boolean") throw new Error(`${type} must be a boolean`);
  return b;
};

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
};
