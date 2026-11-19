import { users } from "@/config/mongoCollections";
import validation from "@/validation";
import bcrypt from "bcryptjs";
import { MongoServerError, type Filter, type ObjectId } from "mongodb";
import type { AccountDetails, ManagedAccount, User } from "@/types/user";
const saltRounds = 10;

export class AccountInputError extends Error {}
export class InvalidCredentialsError extends Error {}

type SanitizedUser = Pick<ManagedAccount, "id" | "username" | "permissionLevel">;

/**
 * Checks if a given username and password combination is valid
 * @param {string} username - Username to test
 * @param {string} password - Password to test
 * @returns The user's ID, username, and permission level
 */
const verifyUser = async (
  username: string,
  password: string
): Promise<SanitizedUser> => {
  try {
    username = validation.verifyUsername(username);
    password = validation.verifyPassword(password);
  } catch (error) {
    if (error instanceof Error) throw new InvalidCredentialsError(error.message);
    throw error;
  }

  // Fetch the user document from the database
  const usersCollection = await users();
  const user = await usersCollection.findOne({ username });

  if (!user) throw new InvalidCredentialsError("User not found");

  // Compare the provided password with the hashed password in the database
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) throw new InvalidCredentialsError("Username and password did not match");

  // Return the identity used by the session.
  return {
    id: user._id.toString(),
    username: user.username,
    permissionLevel: user.permissionLevel,
  };
};

type ProfileDetails = Pick<AccountDetails, "username" | "email">;

function validateProfile(details: ProfileDetails): ProfileDetails {
  try {
    const email = details.email?.trim();
    return {
      username: validation.verifyUsername(details.username),
      ...(email ? { email: validation.verifyEmail(email) } : {}),
    };
  } catch (error) {
    if (error instanceof Error) throw new AccountInputError(error.message);
    throw error;
  }
}

function validateAccount(details: AccountDetails): AccountDetails {
  const profile = validateProfile(details);
  try {
    return { ...profile, permissionLevel: validation.verifyPermissionLevel(details.permissionLevel) };
  } catch (error) {
    if (error instanceof Error) throw new AccountInputError(error.message);
    throw error;
  }
}

async function hashPassword(password: string): Promise<string> {
  try {
    password = validation.verifyPassword(password);
    if (bcrypt.truncates(password)) throw new Error("Password must fit within 72 UTF-8 bytes.");
  } catch (error) {
    if (error instanceof Error) throw new AccountInputError(error.message);
    throw error;
  }
  return bcrypt.hash(password, saltRounds);
}

async function accountsForWrite() {
  const collection = await users();
  await collection.createIndex({ username: 1 }, {
    name: "unique_account_username",
    unique: true,
    partialFilterExpression: { username: { $type: "string" } },
  });
  return collection;
}

function rethrowAccountWrite(error: unknown): never {
  if (error instanceof MongoServerError && error.code === 11000) {
    throw new AccountInputError("A user with that username already exists.");
  }
  throw error;
}

async function addUser(input: AccountDetails, password: string): Promise<SanitizedUser> {
  const details = validateAccount(input);
  const hash = await hashPassword(password);
  const collection = await accountsForWrite();
  try {
    const { insertedId } = await collection.insertOne({ ...details, password: hash });
    return {
      id: insertedId.toString(),
      username: details.username,
      permissionLevel: details.permissionLevel,
    };
  } catch (error) {
    rethrowAccountWrite(error);
  }
}

async function listAccounts(ownerId: ObjectId): Promise<ManagedAccount[]> {
  const collection = await users();
  const accounts = await collection.find({ _id: { $ne: ownerId } })
    .project<AccountDetails & { _id: ObjectId }>({
      username: 1, email: 1, permissionLevel: 1,
    })
    .sort({ username: 1 })
    .toArray();
  return accounts.map(({ _id, username, email, permissionLevel }) => ({
    id: _id.toString(),
    username: username ?? "",
    email: email ?? "",
    permissionLevel: permissionLevel ?? "",
  }));
}

async function writeAccount(filter: Filter<User>, input: ProfileDetails & Partial<Pick<User, "permissionLevel">>, password: string) {
  const { email, ...details } = input;
  const passwordUpdate = password ? { password: await hashPassword(password) } : {};
  const collection = await accountsForWrite();
  try {
    const result = await collection.updateOne(filter, {
      $set: { ...details, ...passwordUpdate, ...(email ? { email } : {}) },
      ...(email ? {} : { $unset: { email: "" } }),
    });
    return result.matchedCount > 0;
  } catch (error) {
    rethrowAccountWrite(error);
  }
}

async function updateAccount(id: ObjectId, input: AccountDetails, password: string) {
  if (!await writeAccount({ _id: id }, validateAccount(input), password)) {
    throw new AccountInputError("Account not found.");
  }
}

async function updateProfile(id: ObjectId, input: ProfileDetails, currentPassword: string, newPassword: string) {
  const account = await (await users()).findOne({ _id: id }, { projection: { username: 1, password: 1 } });
  if (!account?.password || !currentPassword || !await bcrypt.compare(currentPassword.trim(), account.password)) {
    throw new AccountInputError("Current password is incorrect.");
  }

  const details = validateProfile(input);
  const saved = await writeAccount(
    { _id: id, password: account.password, username: account.username },
    details,
    newPassword,
  );
  if (!saved) throw new AccountInputError("Your account changed while saving. Reload and try again.");

  return {
    username: details.username,
    email: details.email ?? "",
  };
}

export default { verifyUser, addUser, listAccounts, updateAccount, updateProfile };
