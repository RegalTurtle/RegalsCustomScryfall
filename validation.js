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
 * Verifies that a given username fits the username parameters
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

export default { verifyStr, verifyUsername, verifyPassword };
