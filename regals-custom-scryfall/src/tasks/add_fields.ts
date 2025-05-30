import { cards } from "@/config/mongoCollections";
import { Card } from "@/types";
import { Collection } from "mongodb";

const cardCollection: Collection<Card> = await cards();
const allCards: Array<Card> = await cardCollection.find({}).toArray();