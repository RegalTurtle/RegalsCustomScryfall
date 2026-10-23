import { Db, MongoClient } from "mongodb";
import dotenv from "dotenv"; // Import dotenv to load environment variables

dotenv.config(); // Loads the variables from .env file

let _connection: MongoClient | undefined = undefined;
let _db: Db | undefined = undefined;

export const dbConnection = async (): Promise<Db> => {
  if (!_connection) {
    _connection = await MongoClient.connect(process.env.MONGO_URL || ""); // Use environment variable
    _db = _connection.db(process.env.DATABASE_NAME); // Use environment variable
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
