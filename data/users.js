import users from "../config/mongoCollections.js";
import validation from "../validation.js";
import bcrypt from "bcryptjs";
const saltRounds = 10;

const verifyUser = async (username, password) => {
  username = validation.verifyPassword(username);
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
