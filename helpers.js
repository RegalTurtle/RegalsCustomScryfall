// Put helpers here

const colors = ["W", "U", "B", "R", "G", "C"];
const rarities = ["C", "U", "R", "M", "T"];

/**
 * Takes in a mana cost and returns the color identity of the card in WUBRG order
 * @param {string} manaCost A string formatted as the mana cost of a spell
 * @returns A string that is the colorId built from the mana cost
 */
const getColorsFromCost = (manaCost) => {
  var colors = "";
  if (manaCost.includes("W")) colors += "w";
  if (manaCost.includes("U")) colors += "u";
  if (manaCost.includes("B")) colors += "b";
  if (manaCost.includes("R")) colors += "r";
  if (manaCost.includes("G")) colors += "g";
  if (colors.length === 0) colors = "c";
  return colors;
};

/**
 * Takes a card object and returns the color of the card
 * @param {object} cardObj The object that represents a card
 * @returns A string that informs what the color of the card is
 */
const getColorsFromObj = (cardObj) => {
  if (cardObj.color) return cardObj.color.toLowerCase();
  return getColorsFromCost(cardObj.cost);
};

/**
 * Checks if str2 contains all characters in str1
 * @param {string} str1 "inner"/"smaller" string
 * @param {string} str2 "outer"/"larger" string
 * @returns true if all chars of str1 are in str2, and false otherwise
 */
const containsAllCharacters = (str1, str2) => {
  for (j = 0; j < str1.length; j++) {
    if (str2.includes(str1.charAt(j))) {
      continue;
    }
    return false;
  }
  return true;
};

/**
 * Takes a mana cost and returns the CMC/mana value of that spell
 * @param {string} manaCost A string formatted as the mana cost of a spell
 * @returns The CMC/MV of the spell
 */
const calculateManaValue = (manaCost) => {
  // Remove all curly braces
  const cleanString = manaString.replace(/{|}/g, "");

  // Initialize total cost
  let totalCost = 0;

  // Loop through each character in the cleaned string
  for (let char of cleanString) {
    // Check if the character is a digit
    if (!isNaN(char)) {
      // Add the numeric value to the total cost
      totalCost += parseInt(char);
    } else if (char !== "X") {
      // If not a number and not 'X', add 1
      totalCost += 1;
    }
  }

  return totalCost;
};

/**
 * Takes two strings and returns true iff they have the exact same characters, agnostic of order
 * @param {string} str1 First string
 * @param {string} str2 Second string
 * @returns true if str1 and str2 have exactly the same characters
 */
const haveSameCharacters = (str1, str2) => {
  const sortString = (str) => str.split("").sort().join("");
  return sortString(str1) === sortString(str2);
};

/**
 * Returns the current date string
 * @returns A string that is the current date string
 */
const getCurrentDateYYYYMMDD = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are zero-indexed
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
};

export default {
  colors,
  rarities,
  getColorsFromCost,
  getColorsFromObj,
  containsAllCharacters,
  calculateManaValue,
  haveSameCharacters,
  getCurrentDateYYYYMMDD,
};
