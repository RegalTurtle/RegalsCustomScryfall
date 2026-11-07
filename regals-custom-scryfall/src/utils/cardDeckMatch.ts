/** Match color identity only; format legality is a separate concern. */
export function cardFitsDeck(cardIdentity: readonly string[], deckIdentity = ""): boolean {
  const colors = new Set(deckIdentity.toUpperCase());
  return cardIdentity.every(color => colors.has(color.toUpperCase()));
}
import type { Deck } from "../types/deck";
import { normalizeColorId, monoColorGroups, twoColorGroups, threeColorGroups, fourColorGroups } from "./deckColors";

const identityOrder = ["", ...monoColorGroups.map(group => group.colorId), ...twoColorGroups.map(group => group.colorId), ...threeColorGroups.map(group => group.colorId), ...fourColorGroups.map(group => group.colorId), "WUBRG"];

export function matchingEdhDecks(decks: Deck[], cardIdentity: readonly string[]): Deck[] {
  return decks.filter(deck => deck.together !== false && deck.format.trim().toLowerCase() === "edh" && cardFitsDeck(cardIdentity, deck.colorId))
    .sort((a, b) => Number(Boolean(b.mainForColorIdentity)) - Number(Boolean(a.mainForColorIdentity))
      || identityOrder.indexOf(normalizeColorId(a.colorId)) - identityOrder.indexOf(normalizeColorId(b.colorId))
      || a.name.localeCompare(b.name));
}

