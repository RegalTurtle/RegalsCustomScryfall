import fs from "node:fs/promises";
import path from "node:path";
import { customCards } from "@/config/customCardCollections";
import { CustomCard } from "@/types/customCard";

const sourcePath = path.resolve(process.cwd(), "..", "customcards.json");
const source = JSON.parse(await fs.readFile(sourcePath, "utf8")) as CustomCard[];
const collection = await customCards();

for (const card of source) {
  await collection.replaceOne(
    { set: card.set, cn: card.cn },
    { ...card, notes: card.notes ?? [] },
    { upsert: true },
  );
}

console.log(`Migrated ${source.length} custom cards from ${sourcePath}`);
