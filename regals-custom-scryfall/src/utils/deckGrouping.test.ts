import assert from "node:assert/strict";
import test from "node:test";

import type { Card } from "../types";
import { groupCardsByManaValue } from "./deckGrouping";

const makeCard = (overrides: Partial<Card>): Card => ({
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
  type: "Creature - Human",
  cmc: 1,
  ...overrides,
});

test("groups cards into ascending mana value piles", () => {
  const cards: Card[] = [
    makeCard({ name: "Lightning Bolt", cmc: 1 }),
    makeCard({ name: "Forest", cmc: 0, type: "Land - Forest" }),
    makeCard({ name: "Ravenous Squirrel", cmc: 2 }),
    makeCard({ name: "Hardened Scales", cmc: 2 }),
    makeCard({ name: "Ancestral Recall", cmc: 1 }),
  ];

  const groups = groupCardsByManaValue(cards);

  assert.deepEqual(
    groups.map(group => group.pileName),
    ["Mana value 0", "Mana value 1", "Mana value 2"],
  );
  assert.deepEqual(
    groups[1].cards.map(card => card.name),
    ["Ancestral Recall", "Lightning Bolt"],
  );
  assert.deepEqual(
    groups[2].cards.map(card => card.name),
    ["Hardened Scales", "Ravenous Squirrel"],
  );
});
