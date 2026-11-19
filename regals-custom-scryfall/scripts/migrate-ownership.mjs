import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import { pathToFileURL } from "node:url";

export const personalCollections = ["decks", "bulk_cards", "cool_cards", "trade_binder", "card_watchlist", "games"];
const inventory = personalCollections.slice(1, 5);
const validId = value => value instanceof ObjectId;
const key = value => validId(value) ? value.toHexString() : null;

/** Read-only planning. Missing means absent, not null/string/otherwise malformed. */
export async function planMigration(db, username) {
  if (!username || typeof username !== "string") throw new Error("An explicit --owner username is required");
  const accounts = await db.collection("users").find({ username }).toArray();
  if (accounts.length !== 1 || !validId(accounts[0]._id)) throw new Error("Owner must resolve to exactly one existing MongoDB account");
  const userId = accounts[0]._id;
  const userIds = new Set((await db.collection("users").find({}).toArray()).map(u => key(u._id)));
  const report = { owner: username, userId: key(userId), collections: {}, issues: [], blockingIndexes: [], indexesToCreate: [] };
  const roots = {};
  for (const name of personalCollections) {
    const collection = db.collection(name);
    const rows = await collection.find({}).toArray();
    roots[name] = rows;
    const missing = rows.filter(r => !Object.hasOwn(r, "userId"));
    report.collections[name] = { total: rows.length, missing: missing.length, owned: rows.length - missing.length };
    for (const row of rows) {
      if (!Object.hasOwn(row, "userId")) continue;
      if (!validId(row.userId) || !userIds.has(key(row.userId))) report.issues.push({ collection: name, id: String(row._id), issue: "Malformed ownership or user does not exist" });
    }
    let indexes = [];
    try { indexes = await collection.listIndexes().toArray(); }
    catch (err) { if (err.code !== 26) throw err; }
    for (const index of indexes) {
      if (index.unique && index.name !== "_id_" && !Object.hasOwn(index.key, "userId")) {
        report.blockingIndexes.push({ collection: name, name: index.name, key: index.key, issue: "Global unique constraint needs a reviewed user-scoped replacement" });
      }
    }
    const keys = inventory.includes(name)
      ? [{ userId: 1, updatedAt: -1 }, { userId: 1, set: 1, cn: 1, foil: 1, proxy: 1 }, { userId: 1, name: 1 }]
      : name === "decks"
        ? [{ userId: 1, name: 1 }, { userId: 1, format: 1, colorId: 1 }, ...["cards", "sideboard", "maybeboard", "wishlist"].map(s => ({ userId: 1, [`${s}.name`]: 1 }))]
        : [{ userId: 1, date: -1, createdAt: -1 }, { userId: 1, deckId: 1, date: -1 }, { userId: 1, format: 1, result: 1, date: -1 }];
    for (const indexKey of keys) report.indexesToCreate.push({ collection: name, key: indexKey });
  }
  const effectiveOwner = row => Object.hasOwn(row, "userId") ? key(row.userId) : key(userId);
  const deckById = new Map(roots.decks.map(deck => [String(deck._id), deck]));
  for (const game of roots.games) {
    if (!Object.hasOwn(game, "deckId")) continue;
    const deck = validId(game.deckId) ? deckById.get(String(game.deckId)) : null;
    if (!deck || effectiveOwner(game) !== effectiveOwner(deck)) report.issues.push({ collection: "games", id: String(game._id), issue: "Malformed, dangling, or cross-user deck link; review legacy Express links manually" });
  }
  return report;
}

export async function migrateOwnership(db, username, { apply = false } = {}) {
  const report = await planMigration(db, username);
  report.mode = apply ? "apply" : "dry-run";
  if (!apply) return report;
  if (report.issues.length || report.blockingIndexes.length) throw new Error("Migration blocked: run dry-run and resolve ownership/link/index issues first");
  const userId = new ObjectId(report.userId);
  // Writers must be stopped. Re-check missing ownership in the write filter so
  // existing ownership is preserved even on reruns or interrupted migrations.
  for (const name of personalCollections) {
    const result = await db.collection(name).updateMany({ userId: { $exists: false } }, { $set: { userId } });
    report.collections[name].assigned = result.modifiedCount;
  }
  for (const index of report.indexesToCreate) await db.collection(index.collection).createIndex(index.key);
  return report;
}

export async function main(args = process.argv.slice(2)) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (["--owner", "--database"].includes(args[i])) {
      const name = args[i].slice(2);
      if (!args[i + 1] || args[i + 1].startsWith("--") || options[name]) throw new Error(`Missing or duplicate --${name}`);
      options[name] = args[++i];
    } else if (args[i] === "--apply") options.apply = true;
    else throw new Error(`Unknown option: ${args[i]}`);
  }
  if (!options.owner || !options.database) throw new Error("Usage: node scripts/migrate-ownership.mjs --owner USERNAME --database DATABASE [--apply]");
  dotenv.config();
  if (!process.env.MONGO_URL) throw new Error("MONGO_URL is required");
  const client = new MongoClient(process.env.MONGO_URL, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const report = await migrateOwnership(client.db(options.database), options.owner, { apply: options.apply });
    console.log(JSON.stringify(report, null, 2));
  } finally { await client.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => { console.error(err.message); process.exitCode = 1; });
}
