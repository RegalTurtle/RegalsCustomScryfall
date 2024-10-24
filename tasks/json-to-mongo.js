import { cards } from "../config/mongoCollections.js"; // Adjust path if needed
import { dbConnection, closeConnection } from "../config/mongoConnections.js";
import fs from "fs/promises"; // For file operations
import path from "path"; // To resolve the path to customcards.json

const loadCardsIntoDB = async () => {
  let db;
  try {
    db = await dbConnection(); // Connect to DB
    const cardCollection = await cards();

    // Read and parse the customcards.json file
    const filePath = path.resolve("customcards.json");
    const cardData = await fs.readFile(filePath, "utf8");
    const parsedCards = JSON.parse(cardData);

    // Insert cards, skipping duplicates based on unique fields (like 'name' or 'cn')
    for (let card of parsedCards) {
      const existingCard = await cardCollection.findOne({
        name: card.name,
        cn: card.cn,
        set: card.set,
      });
      if (!existingCard) {
        await cardCollection.insertOne(card);
        console.log(
          `Inserted card: ${card.name} (CN: ${card.cn}, Set: ${card.set})`
        );
      } else {
        console.log(
          `Skipped duplicate card: ${card.name} (CN: ${card.cn}, Set: ${card.set})`
        );
      }
    }
  } catch (e) {
    console.error("Error while loading cards into the database:", e);
  } finally {
    if (db) {
      await closeConnection(); // Close DB connection when done
    }
  }
};

loadCardsIntoDB();
