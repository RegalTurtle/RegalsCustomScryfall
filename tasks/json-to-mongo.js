// take json and add any unadded elements to the database

import { cards } from "./mongoCollections.js";
import fs from "fs/promises"; // For file operations
import path from "path"; // To resolve the path to customcards.json

const loadCardsIntoDB = async () => {
  try {
    // Read and parse the customcards.json file
    const filePath = path.resolve("customcards.json");
    const cardData = await fs.readFile(filePath, "utf8");
    const parsedCards = JSON.parse(cardData);

    // Get the 'cards' collection
    const cardCollection = await cards();

    // Insert the parsed card data into the collection
    const insertResult = await cardCollection.insertMany(parsedCards);
    console.log(
      `Inserted ${insertResult.insertedCount} cards into the database.`
    );
  } catch (e) {
    console.error("Error while loading cards into the database:", e);
  }
};

loadCardsIntoDB();
