import { Db, MongoClient } from "mongodb";
import dotenv from "dotenv"; // Import dotenv to load environment variables
import path from "node:path";

dotenv.config({
  path: [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", ".env"),
  ],
});

let _connection: MongoClient | undefined = undefined;
let _db: Db | undefined = undefined;

export const dbConnection = async (): Promise<Db> => {
  if (!_connection) {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not configured");
    }
    if (!process.env.DATABASE_NAME) {
      throw new Error("DATABASE_NAME is not configured");
    }

    _connection = await MongoClient.connect(mongoUri);
    _db = _connection.db(process.env.DATABASE_NAME);
  }
  if (_db) {
    return _db;
  }
  throw new Error(`Database not found`);
};

export const closeConnection = async (): Promise<undefined> => {
  if (_connection) {
    await _connection.close();
    return;
  }
  throw new Error(`Connection failed to close`);
};
