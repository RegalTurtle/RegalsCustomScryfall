import assert from "node:assert/strict";
import test from "node:test";
import { cardFitsDeck, matchingEdhDecks } from "./cardDeckMatch";
import type { Deck } from "../types/deck";

test("card identity must be a subset of deck identity", () => {
  assert.equal(cardFitsDeck(["U"], "WU"), true);
  assert.equal(cardFitsDeck(["U", "R"], "WU"), false);
  assert.equal(cardFitsDeck(["W", "U", "B", "R", "G"], "WUBRG"), true);
  assert.equal(cardFitsDeck(["G"], ""), false);
  assert.equal(cardFitsDeck(["G"]), false);
});

test("colorless cards fit every identity, including colorless decks", () => {
  for (const identity of [undefined, "", "U", "WUBRG"]) {
    assert.equal(cardFitsDeck([], identity), true);
  }
});

test("EDH matches prioritize main decks and follow the decks page's color order", () => {
  const deck = (name: string, colorId: string, mainForColorIdentity = true, format = "EDH") => ({ name, colorId, mainForColorIdentity, format } as Deck);
  const decks = [
    deck("Other white", "W", false), deck("Main green", "G"),
    deck("Main Azorius", "WU"), deck("Main blue", "U"),
    deck("Main white", "W"), deck("Modern", "W", true, "Modern"),
    deck("Main colorless", ""), deck("Other blue", "U", false),
    { ...deck("Unbuilt main", "U"), together: false },
    { ...deck("Unbuilt other", "WU", false), together: false },
    { ...deck("Built red", "R"), together: true },
  ];
  assert.deepEqual(matchingEdhDecks(decks, []).map(deck => deck.name), [
    "Main colorless", "Main white", "Main blue", "Built red", "Main green", "Main Azorius", "Other white", "Other blue",
  ]);
  assert.deepEqual(matchingEdhDecks(decks, ["U"]).map(deck => deck.name), ["Main blue", "Main Azorius", "Other blue"]);
});
