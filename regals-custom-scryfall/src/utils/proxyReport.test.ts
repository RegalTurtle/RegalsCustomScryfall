import assert from "node:assert/strict";
import test from "node:test";

import type { Card, Deck } from "../types";
import { getNetProxyCardsForDeck } from "./proxyReport";

const makeCard = (overrides: Partial<Card> = {}): Card => ({
  name: "Test Card",
  quant: 1,
  set: "war",
  cn: "1",
  foil: "nonfoil",
  proxy: false,
  updatedAt: null,
  image: "",
  oracle: "",
  color: "",
  color_identity: "",
  type: "Creature",
  cmc: 1,
  ...overrides,
});

const makeDeck = (overrides: Partial<Deck> = {}): Deck => ({
  owner: "owner",
  name: "Deck",
  cards: [],
  changes: [],
  lastUpdate: new Date(),
  notes: "",
  format: "standard",
  games: [],
  wins: 0,
  losses: 0,
  sideboard: [],
  maybeboard: [],
  wishlist: [],
  together: true,
  ...overrides,
});

test("planned swap-outs are removed and planned swap-ins are counted instead", () => {
  const deck = makeDeck({
    name: "Test Deck",
    cards: [
      makeCard({ name: "Snapcaster Mage", proxy: true, quant: 2 }),
      makeCard({ name: "Forest", proxy: true, quant: 1 }),
    ],
    maybeboard: [
      makeCard({ name: "Ponder", proxy: true, quant: 2 }),
    ],
    changes: [
      { date: new Date(), cardOut: "Snapcaster Mage", cardIn: "Ponder" },
    ],
  });

  const entries = getNetProxyCardsForDeck(deck);

  assert.deepEqual(
    entries.map(entry => ({ name: entry.name, quantity: entry.quantity })),
    [{ name: "Forest", quantity: 1 }, { name: "Ponder", quantity: 2 }],
  );
});
