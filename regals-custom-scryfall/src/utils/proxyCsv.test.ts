import assert from "node:assert/strict";
import test from "node:test";

import { parseCsvRows, getSharedProxyVersions } from "./proxyCsv";

test("parses CSV rows with sep=, and finds exact proxy matches", () => {
  const csv = `"sep=,"\nList Type,List Name,Collection,Format,Board,Quantity,Card Name,Set Code,Set Name,Card Number,Condition,Printing,Rarity,Language,Price Bought,Date Bought,Parent List Type,Parent List Name,Current Price (tcgplayer_marketsellprice),List Cover Image,Parent List Cover Image\n1,My List,bulk,standard,main,1,Lightning Bolt,lea,Limited Edition Alpha,1,Near Mint,Alpha,common,English,1.00,2024-01-01,1,My List,0.50,https://example.com/list.png,https://example.com/parent.png\n1,My List,bulk,standard,main,1,Lightning Bolt,m10,Magic 2010,1,Near Mint,Core Set,common,English,0.75,2024-01-02,1,My List,0.40,https://example.com/list.png,https://example.com/parent.png\n1,My List,bulk,standard,main,1,Forest,lea,Limited Edition Alpha,200,Near Mint,Alpha,common,English,0.20,2024-01-03,1,My List,0.10,https://example.com/list.png,https://example.com/parent.png`;

  const rows = parseCsvRows(csv);
  assert.equal(rows.length, 3);
  assert.equal(rows[0]["Card Name"], "Lightning Bolt");
  assert.equal(rows[0]["Set Code"], "lea");

  const matches = getSharedProxyVersions(
    [
      { card: { name: "Lightning Bolt", set: "lea", cn: "1" } },
      { card: { name: "Forest", set: "lea", cn: "200" } },
      { card: { name: "Lightning Bolt", set: "m10", cn: "1" } },
    ] as any,
    rows,
  );

  assert.equal(matches.sharedCards.length, 2);
  assert.deepEqual(
    matches.sharedCards.map(card => card.name),
    ["Forest", "Lightning Bolt"],
  );
  assert.equal(matches.sharedCards[0].versions.length, 1);
  assert.equal(matches.sharedCards[1].versions.length, 2);
});

test("matches same-name cards across different printings", () => {
  const csv = `"sep=,"
List Type,List Name,Collection,Format,Board,Quantity,Card Name,Set Code,Set Name,Card Number,Condition,Printing,Rarity,Language,Price Bought,Date Bought,Parent List Type,Parent List Name,Current Price (tcgplayer_marketsellprice),List Cover Image,Parent List Cover Image
Folder,plains,mtg,,,1,Plains,SOS,Secrets of Strixhaven,273,NearMint,Normal,common,en,0.01,2026-09-21,,,0.15,312369,
Folder,plains,mtg,,,1,Plains,MKM,The Lost Caverns of Ixalan,258,NearMint,Normal,common,en,0.02,2026-09-21,,,0.22,312369,`;

  const rows = parseCsvRows(csv);
  const matches = getSharedProxyVersions(
    [
      { card: { name: "Plains", set: "m20", cn: "270" } },
      { card: { name: "Plains", set: "lea", cn: "262" } },
    ] as any,
    rows,
  );

  assert.equal(matches.sharedCards.length, 1);
  assert.equal(matches.sharedCards[0].name, "Plains");
  assert.equal(matches.sharedCards[0].versions.length, 2);
});
