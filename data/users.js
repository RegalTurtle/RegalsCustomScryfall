import { users } from "../config/mongoCollections.js";
import validation from "../validation.js";
import bcrypt from "bcryptjs";
const saltRounds = 10;

/**
 * Checks if a given username and password combination is valid
 * @param {string} username - Username to test
 * @param {string} password - Password to test
 * @returns An object with the username, firstName, lastName, and permissionLevel of the user
 */
const verifyUser = async (username, password) => {
  username = validation.verifyUsername(username);
  password = validation.verifyPassword(password);

  // Fetch the user document from the database
  const usersCollection = await users();
  const user = await usersCollection.findOne({ username });

  if (!user) throw new Error("User not found");

  // Compare the provided password with the hashed password in the database
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) throw new Error("Username and password did not match");

  // User credentials are valid, return the user document
  return {
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    permissionLevel: user.permissionLevel,
  };
};

/**
 * Adds a user to the database, hashes their password, and checks to not insert duplicate usernames
 * @param {string} username - username of new user
 * @param {string} password - plaintext password of new user
 * @param {string} firstName - first name of new user
 * @param {string} lastName - last name of new user
 * @param {string} email - email of new user
 * @param {string} permissionLevel - permission level of new user
 * @returns
 */
const addUser = async (
  username,
  password,
  firstName,
  lastName,
  email,
  permissionLevel
) => {
  // Validate all inputs
  username = validation.verifyUsername(username);
  password = validation.verifyPassword(password);
  firstName = validation.verifyStr(firstName, `firstName`);
  lastName = validation.verifyStr(lastName, `lastName`);
  email = validation.verifyEmail(email);
  permissionLevel = validation.verifyPermissionLevel(permissionLevel);

  // Fetch users collection from DB
  const usersCollection = await users();
  const userIfFound = await usersCollection.findOne({ username });
  if (userIfFound) throw new Error(`A user with that username already exists.`);

  const hash = await bcrypt.hash(password, saltRounds);
  const user = {
    username,
    firstName,
    lastName,
    email,
    password: hash,
    permissionLevel,
  };

  await usersCollection.insertOne(user);

  return {
    username,
    firstName,
    lastName,
    permissionLevel,
  };
};

export default { verifyUser, addUser };
