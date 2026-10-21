import { customCards } from "@/config/customCardCollections";
import { CustomCard } from "@/types/customCard";

export type CustomSearchOptions = {
  query: string;
};

function manaValue(cost = ""): number {
  return cost.replace(/[{}]/g, "").split("").reduce((total, character) => {
    if (/\d/.test(character)) return total + Number(character);
    return character === "X" ? total : total + 1;
  }, 0);
}

function colors(card: CustomCard): string {
  if (card.color) return card.color.toLowerCase();
  const colorSet = ["w", "u", "b", "r", "g"].filter(color => card.cost?.toLowerCase().includes(color));
  return colorSet.join("") || "c";
}

function containsAllCharacters(needle: string, haystack: string): boolean {
  return [...needle].every(character => haystack.includes(character));
}

function sameCharacters(left: string, right: string): boolean {
  return [...left].sort().join("") === [...right].sort().join("");
}

function tokenize(query: string): string[] {
  return query.toLowerCase().match(/(?:[^\s"]+|"[^"]*")+/g)?.map(token => token.replace(/"/g, "")) ?? [];
}

function matchesToken(card: CustomCard, token: string): boolean {
  const type = card.type?.toLowerCase() ?? "";
  const text = card.text?.toLowerCase() ?? "";
  const cardColors = colors(card);

  if (token.startsWith("t:")) return type.includes(token.slice(2));
  if (token.startsWith("s:")) return card.set.toLowerCase() === token.slice(2);
  if (token.startsWith("id:")) return containsAllCharacters(token.slice(3), (card.id ?? "").toLowerCase());
  if (token.startsWith("c=")) return sameCharacters(cardColors, token.slice(2));
  if (token.startsWith("c>=")) return containsAllCharacters(token.slice(3), cardColors);
  if (token.startsWith("c<=")) return containsAllCharacters(cardColors, token.slice(3));
  if (token.startsWith("r=")) return (card.rarity ?? "").toLowerCase() === token.slice(2);
  if (token.startsWith("cn=")) return String(card.cn) === token.slice(3);
  if (token.startsWith("o:")) return text.includes(token.slice(2));
  if (token === "is:reprint") return card.tags?.reprint === true;
  if (token === "not:reprint") return card.tags?.reprint === false;
  if (token.startsWith("cmc=")) return manaValue(card.cost) === Number(token.slice(4));
  if (token.startsWith("cmc>")) return manaValue(card.cost) > Number(token.slice(4));
  if (token.startsWith("cmc<")) return manaValue(card.cost) < Number(token.slice(4));
  if (token.startsWith("function:")) return card.tags?.function?.includes(token.slice(9)) ?? false;
  if (token === "has:bleed") return card.has_bleed_edge === true;
  if (token === "-has:bleed") return card.has_bleed_edge !== true;

  const searchName = card.name.toLowerCase();
  const nickname = card.nickname?.toLowerCase() ?? "";
  return searchName.includes(token) || nickname.includes(token);
}

export async function searchCustomCards({ query }: CustomSearchOptions): Promise<CustomCard[]> {
  const collection = await customCards();
  const cards = await collection.find({}).project<CustomCard>({ _id: 0 }).toArray();
  const tokens = tokenize(query);
  const showAll = tokens.includes("show:all");
  const orderByCmc = tokens.includes("order:cmc");
  const filters = tokens.filter(token => token !== "show:all" && token !== "order:cmc");

  return cards
    .filter(card => (showAll || !card.invisible) && filters.every(token => matchesToken(card, token)))
    .sort((left, right) => orderByCmc
      ? manaValue(left.cost) - manaValue(right.cost)
      : left.set.localeCompare(right.set) || left.cn - right.cn);
}

export async function getCustomCard(set: string, cn: number): Promise<CustomCard | null> {
  const collection = await customCards();
  return collection.findOne({ set: set.toUpperCase(), cn }, { projection: { _id: 0 } });
}

export { manaValue };
