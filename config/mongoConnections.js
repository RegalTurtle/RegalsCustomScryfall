import { MongoClient } from "mongodb";
import dotenv from "dotenv"; // Import dotenv to load environment variables

dotenv.config(); // Loads the variables from .env file

let _connection = undefined;
let _db = undefined;

export const dbConnection = async () => {
  if (!_connection) {
    _connection = await MongoClient.connect(process.env.MONGO_URL); // Use environment variable
    _db = _connection.db(process.env.DATABASE_NAME); // Use environment variable
  }
  return _db;
};

export const closeConnection = async () => {
  await _connection.close();
};
