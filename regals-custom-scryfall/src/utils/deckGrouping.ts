import { Card, CardPile } from "@/types";

export type CardSortMode = "name" | "cmc";
export type CardGroupMode = "tags" | "type" | "mana";

export function sortCardsByMode(cards: Card[], mode: CardSortMode): Card[] {
  return [...cards].sort((a, b) => {
    if (mode === "cmc") {
      const manaDiff = (a.cmc ?? 0) - (b.cmc ?? 0);
      if (manaDiff !== 0) return manaDiff;
    }

    const nameDiff = a.name.localeCompare(b.name);
    if (nameDiff !== 0) return nameDiff;
    return `${a.set}|${a.cn}`.localeCompare(`${b.set}|${b.cn}`);
  });
}

function getCardTypeGroup(card: Card): string {
  const type = card.type.toLowerCase();
  if (type.includes("instant")) return "Instants";
  if (type.includes("sorcery")) return "Sorceries";
  if (type.includes("creature")) return "Creatures";
  if (type.includes("artifact")) return "Artifacts";
  if (type.includes("enchantment")) return "Enchantments";
  if (type.includes("planeswalker")) return "Planeswalkers";
  if (type.includes("battle")) return "Battles";
  return "Other";
}

export function groupCardsByTags(cards: Card[], sortMode: CardSortMode = "name"): CardPile[] {
  const pileMap: Record<string, Card[]> = {};

  for (const card of cards) {
    const tags = card.tag?.length ? card.tag : ["Untagged"];
    for (const tag of tags) {
      if (!pileMap[tag]) {
        pileMap[tag] = [];
      }
      pileMap[tag].push(card);
    }
  }

  return Object.entries(pileMap)
    .sort(([a], [b]) => {
      if (a === "Commander") return -1;
      if (b === "Commander") return 1;
      return a.localeCompare(b);
    })
    .map(([pileName, cardsInPile]) => ({
      pileName,
      cards: sortCardsByMode(cardsInPile, sortMode),
    }));
}

export function groupCardsByType(cards: Card[], sortMode: CardSortMode = "name"): CardPile[] {
  const pileMap: Record<string, Card[]> = {};

  for (const card of cards) {
    const pileName = getCardTypeGroup(card);
    if (!pileMap[pileName]) {
      pileMap[pileName] = [];
    }
    pileMap[pileName].push(card);
  }

  const pileOrder = ["Creatures", "Artifacts", "Enchantments", "Planeswalkers", "Battles", "Instants", "Sorceries", "Other"];

  return Object.entries(pileMap)
    .sort(([a], [b]) => pileOrder.indexOf(a) - pileOrder.indexOf(b))
    .map(([pileName, cardsInPile]) => ({
      pileName,
      cards: sortCardsByMode(cardsInPile, sortMode),
    }));
}

export function groupCardsByManaValue(cards: Card[], sortMode: CardSortMode = "name"): CardPile[] {
  const pileMap: Record<string, Card[]> = {};

  for (const card of cards) {
    const manaValue = Math.max(0, Math.floor(card.cmc ?? 0));
    const pileName = `Mana value ${manaValue}`;
    if (!pileMap[pileName]) {
      pileMap[pileName] = [];
    }
    pileMap[pileName].push(card);
  }

  return Object.entries(pileMap)
    .sort(([a], [b]) => {
      const aValue = Number(a.replace("Mana value ", ""));
      const bValue = Number(b.replace("Mana value ", ""));
      return aValue - bValue;
    })
    .map(([pileName, cardsInPile]) => ({
      pileName,
      cards: sortCardsByMode(cardsInPile, sortMode),
    }));
}
