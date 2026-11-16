const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { MongoClient, ObjectId } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Execute the actual TS data functions and route handlers; only the session
// provider is substituted. All database operations run against real MongoDB.
const src = path.resolve(__dirname, '../src');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...rest) {
  return resolve.call(this, name.startsWith('@/') ? path.join(src, name.slice(2)) : name, ...rest);
};
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: file,
}).outputText, file);
let session = null;
const load = Module._load;
Module._load = function(name, ...rest) {
  if (name === 'next-auth') return { getServerSession: async () => session };
  return load.call(this, name, ...rest);
};

let server, client, db, cards, decks, games, migration;
const a = new ObjectId(), b = new ObjectId();
const baseCard = { name: 'Test Card', quant: 3, set: 'tst', cn: '1', foil: 'nonfoil', proxy: false,
  updatedAt: new Date(), image: 'https://example.com/card.jpg', oracle: '', color: '', color_identity: '', type: 'Artifact', cmc: 1 };
const gameInput = { date: '2026-11-12', format: 'Commander', result: 'win', numPlayers: 4, deckName: 'Snapshot', turnNumber: 5 };
const route = relative => require(path.join(src, 'app/api', relative, 'route.ts'));
const request = (url = '/', body) => { const r = new Request(`http://localhost${url}`, body ? { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}); r.nextUrl = new URL(r.url); return r; };
const params = value => ({ params: Promise.resolve(value) });
async function addCard(userId, collection = 'bulk', overrides = {}) {
  const c = { ...baseCard, ...overrides };
  await cards.addCard(userId, collection, c.name, c.quant, c.set, c.cn, c.foil, c.proxy, c.image, c.oracle, c.color, c.color_identity, c.type, c.cmc);
  const name = { bulk: 'bulk_cards', 'cool-cards': 'cool_cards', 'trade-binder': 'trade_binder', watchlist: 'card_watchlist' }[collection];
  return db.collection(name).findOne({ userId, set: c.set, cn: c.cn, foil: c.foil, proxy: c.proxy });
}
async function addDeck(userId, name = 'Test Deck', proxy = true) {
  const id = await decks.addDeck(userId, name, null, 'Descriptive attribution', 'Commander', null);
  await decks.replaceCards(userId, id.toString(), [{ ...baseCard, quant: 1, proxy }]);
  return id;
}
async function snapshot() {
  const result = {};
  for (const name of migration.personalCollections) result[name] = await db.collection(name).find({}).sort({ _id: 1 }).toArray();
  return JSON.stringify(result);
}

before(async () => {
  // No configured application database URL is ever used by this test suite.
  server = await MongoMemoryServer.create({ binary: { version: '7.0.24' }, instance: { dbName: 'isolation_test' } });
  process.env.MONGO_URL = server.getUri();
  process.env.DATABASE_NAME = 'isolation_test';
  client = await MongoClient.connect(process.env.MONGO_URL);
  db = client.db(process.env.DATABASE_NAME);
  cards = require('@/data/cards').default;
  decks = require('@/data/decks').default;
  games = require('@/data/games').default;
  migration = await import('../scripts/migrate-ownership.mjs');
  await db.collection('users').insertMany([{ _id: a, username: 'a' }, { _id: b, username: 'b' }]);
});
after(async () => {
  if (server) { await require('@/config/mongoConnections').closeConnection().catch(() => {}); await client?.close(); await server.stop(); }
});

test('two users independently own equivalent inventory, watchlists, decks and games', async () => {
  for (const c of ['bulk', 'cool-cards', 'trade-binder', 'watchlist']) {
    const ca = await addCard(a, c), cb = await addCard(b, c);
    assert.notEqual(String(ca._id), String(cb._id));
    assert.equal((await cards.getPageOfCards(a, 1, c)).length, 1);
    assert.equal((await cards.getPageOfCards(b, 1, c)).length, 1);
  }
  const da = await addDeck(a, 'A'), dbId = await addDeck(b, 'B');
  await games.addGame(a, { ...gameInput, deckId: String(da) });
  await games.addGame(b, { ...gameInput, deckId: String(dbId), result: 'loss' });
  assert.equal((await decks.getAllDecks(a)).length, 1);
  assert.equal(await decks.findDeckByMongoId(a, String(dbId)), null);
  const bg = await db.collection('games').findOne({ userId: b });
  await assert.rejects(games.deleteGame(a, String(bg._id)), /not found/);
  assert.equal(games.getGameStats(await games.getGames(a)).winRate, 1);
  assert.equal(games.getGameStats(await games.getGames(b)).winRate, 0);
  assert.equal((await cards.getOwnedVersionsByName(a, baseCard.name)).length, 3);
  const ca = await db.collection('bulk_cards').findOne({ userId: a });
  const cb = await db.collection('bulk_cards').findOne({ userId: b });
  assert.equal((await cards.getCardBySetCn(a, 'tst', '1', 'nonfoil'))._id.toString(), ca._id.toString());
  await assert.rejects(cards.getCardByMongoId(a, String(cb._id)), /not found/);
});

test('foreign IDs fail before any writes, including transfers, replacements and game links', async () => {
  const da = await db.collection('decks').findOne({ userId: a });
  const dbId = await db.collection('decks').findOne({ userId: b });
  const cb = await db.collection('bulk_cards').findOne({ userId: b });
  const ca = await db.collection('bulk_cards').findOne({ userId: a });
  const before = await snapshot();
  await assert.rejects(cards.removeCard(a, 'bulk', String(cb._id), 1), /not found/);
  await assert.rejects(cards.changeCardFoil(a, 'bulk', String(cb._id), 1, 'foil'), /not found/);
  await assert.rejects(cards.transferCard(a, 'bulk', 'cool-cards', String(cb._id), 1), /not found/);
  await assert.rejects(decks.replaceCards(a, String(dbId._id), []), /not found/);
  await assert.rejects(decks.updateDeckSettings(a, String(dbId._id), 'Hijacked', null, 'a', 'Commander', null, false), /not found/);
  await assert.rejects(decks.setTags(a, String(dbId._id), 'tst', '1', ['X']), /not found/);
  await assert.rejects(decks.addPlannedChange(a, String(dbId._id), 'Out', 'In'), /not found/);
  await assert.rejects(decks.removePlannedChange(a, String(dbId._id), 0), /not found/);
  await assert.rejects(decks.moveCardCopies(a, String(dbId._id), 'cards', 'sideboard', 'tst', '1', 'nonfoil', true, 1), /not found/);
  await assert.rejects(decks.replaceProxyWithOwnedCard(a, String(da._id), 'tst', '1', 'bulk', String(cb._id)), /not found/);
  await assert.rejects(decks.replaceProxyWithOwnedCard(a, String(dbId._id), 'tst', '1', 'bulk', String(ca._id)), /not found/);
  await assert.rejects(addCard(a, `decks+${dbId._id}`), /collection_type|collectionType|not found/);
  await assert.rejects(games.addGame(a, { ...gameInput, deckId: String(dbId._id) }), /not found/);
  assert.equal(await snapshot(), before);
});

test('direct-query routes, reports, searches, pagination and statistics are scoped', async () => {
  session = { user: { id: String(a), permissionLevel: 'owner' } };
  const search = route('collection/[collection_type]/search/[search_terms]');
  const response = await search.GET(request(), params({ collection_type: 'bulk', search_terms: 'Test' }));
  const results = await response.json();
  assert.equal(results.length, 1);
  assert.ok(results.every(c => c.userId === String(a)));
  const decksResponse = await route('decks/all_decks').GET();
  assert.ok((await decksResponse.json()).allDecks.every(d => d.userId === String(a)));
  const usage = await route('collection/card_deck_usage').GET(request('/?name=Test%20Card'));
  assert.deepEqual((await usage.json()).usages.map(d => d.deckName), ['A']);
  const report = await route('decks/proxy_report').GET(request());
  const items = (await report.json()).proxyReport;
  assert.equal(items.length, 1);
  assert.equal(items[0].totalOwned, 9);
  assert.equal(items[0].totalProxies, 1);
  assert.deepEqual(items[0].decks.map(d => d.deckName), ['A']);
  const stats = await route('games').GET(request());
  assert.equal((await stats.json()).stats.winRate, 1);
  const count = await route('collection/stats/total_card_count').GET(request());
  assert.equal((await count.json()).count, await cards.countAllCards(a));
  const foreign = await db.collection('decks').findOne({ userId: b });
  const denied = await route('decks/[deck_id]/owned_versions').GET(request('/?name=Test'), params({ deck_id: String(foreign._id) }));
  assert.equal(denied.status, 404);
});

test('every personal API handler rejects unauthenticated and legacy sessions before using input', async () => {
  function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
  const handlers = files(path.join(src, 'app/api')).filter(f => f.endsWith('route.ts') && !f.includes(`${path.sep}auth${path.sep}`) && !f.includes(`${path.sep}custom${path.sep}`));
  for (const value of [null, { user: { username: 'a', permissionLevel: 'owner' } }]) {
    session = value;
    for (const file of handlers) {
      for (const [method, handler] of Object.entries(require(file))) {
        if (!['GET', 'POST', 'DELETE', 'PUT', 'PATCH'].includes(method)) continue;
        const response = await handler(request(), params({}));
        assert.equal(response.status, 401, `${method} ${file}`);
      }
    }
  }
  await assert.rejects(cards.getPageOfCards(undefined, 1, 'bulk'), /Authenticated/);
});

test('credential verification and JWT/session use the database ID and reject username-only tokens', async () => {
  const bcrypt = require('bcryptjs');
  const id = new ObjectId();
  const password = 'TestPassword123!';
  await db.collection('users').insertOne({ _id: id, username: 'authuser', password: await bcrypt.hash(password, 4), firstName: 'Test', lastName: 'User', permissionLevel: 'user' });
  const verified = await require('@/data/users').default.verifyUser('authuser', password);
  assert.equal(verified.id, String(id));
  assert.equal(verified.password, undefined);
  const { authOptions } = require('@/auth-options');
  const token = await authOptions.callbacks.jwt({ token: {}, user: { id: verified.id, username: verified.username, permissionLevel: 'user' } });
  const result = await authOptions.callbacks.session({ session: { user: {} }, token });
  assert.equal(result.user.id, String(id));
  const legacy = await authOptions.callbacks.session({ session: { user: {} }, token: { sub: 'authuser', username: 'authuser' } });
  assert.equal(legacy.user.id, '');
});

test('ordinary users manage their own records and cannot submit an ownership override', async () => {
  session = { user: { id: String(a), permissionLevel: 'user' } };
  const response = await route('collection/[collection_type]/add_card').POST(request('/', { ...baseCard, cn: 'own', userId: String(b) }), params({ collection_type: 'bulk' }));
  assert.equal(response.status, 201);
  const own = await db.collection('bulk_cards').findOne({ userId: a, cn: 'own' });
  assert.ok(own);
  assert.equal(await db.collection('bulk_cards').findOne({ userId: b, cn: 'own' }), null);
  await cards.transferCard(a, 'bulk', 'trade-binder', String(own._id), 1);
  assert.equal((await db.collection('bulk_cards').findOne({ _id: own._id })).quant, 2);
  const moved = await db.collection('trade_binder').findOne({ userId: a, cn: 'own' });
  assert.equal(moved.quant, 1);
  await cards.removeCard(a, 'trade-binder', String(moved._id), 1);
  const da = await db.collection('decks').findOne({ userId: a });
  const ca = await db.collection('bulk_cards').findOne({ userId: a, cn: '1' });
  const foreignBefore = JSON.stringify(await db.collection('decks').find({ userId: b }).toArray());
  await decks.replaceProxyWithOwnedCard(a, String(da._id), 'tst', '1', 'bulk', String(ca._id));
  assert.equal((await decks.findDeckByMongoId(a, String(da._id))).cards[0].proxy, false);
  assert.equal(JSON.stringify(await db.collection('decks').find({ userId: b }).toArray()), foreignBefore);
  await decks.addPlannedChange(a, String(da._id), 'Out', 'In');
  await decks.removePlannedChange(a, String(da._id), 0);
  await decks.updateDeckSettings(a, String(da._id), 'A renamed', null, 'Metadata', 'Commander', null, true);
  assert.equal((await games.getGames(a))[0].deckName, 'A renamed');
  assert.equal((await games.getGames(b))[0].deckName, 'B');
});

test('missing ownership stays invisible; migration dry-run, preservation, indexes and reruns', async () => {
  const legacy = { ...baseCard, _id: new ObjectId(), cn: 'legacy' };
  await db.collection('bulk_cards').insertOne(legacy);
  await assert.rejects(cards.getCardByMongoId(a, String(legacy._id)), /not found/);
  const before = await snapshot();
  await assert.rejects(migration.migrateOwnership(db, 'missing'), /exactly one/);
  const dry = await migration.migrateOwnership(db, 'a');
  assert.equal(dry.mode, 'dry-run');
  assert.equal(dry.collections.bulk_cards.missing, 1);
  assert.equal(await snapshot(), before);
  const applied = await migration.migrateOwnership(db, 'a', { apply: true });
  assert.equal(applied.collections.bulk_cards.assigned, 1);
  const owned = await cards.getCardByMongoId(a, String(legacy._id));
  assert.equal(String(owned.userId), String(a));
  assert.equal((await db.collection('bulk_cards').findOne({ userId: b })).quant, 3);
  const after = await snapshot();
  const rerun = await migration.migrateOwnership(db, 'a', { apply: true });
  assert.equal(rerun.collections.bulk_cards.assigned, 0);
  assert.equal(await snapshot(), after);
  await db.collection('bulk_cards').createIndex({ cn: 1, userId: 1 }, { unique: true });
  await db.collection('games').createIndex({ notes: 1 }, { unique: true, partialFilterExpression: { notes: 'unique' } });
  const bad = await migration.migrateOwnership(db, 'a');
  assert.equal(bad.blockingIndexes.length, 1);
  await assert.rejects(migration.migrateOwnership(db, 'a', { apply: true }), /blocked/);
  await db.collection('games').dropIndex('notes_1');
  const malformedId = new ObjectId();
  await db.collection('games').insertOne({ ...gameInput, _id: malformedId, userId: 'not-an-objectid', deckId: new ObjectId() });
  const malformed = await migration.migrateOwnership(db, 'a');
  assert.equal(malformed.issues.length, 2);
  await assert.rejects(migration.migrateOwnership(db, 'a', { apply: true }), /blocked/);
});

// Main added these operations after the isolation branch diverged.
test('rebased main features preserve behavior and reject foreign ownership', async () => {
  const ownDeck = await addDeck(a, 'Rebase regression', false);
  const foreignDeck = await addDeck(b, 'Foreign regression', false);
  const ownId = String(ownDeck), foreignId = String(foreignDeck);
  await decks.makeCardProxy(a, ownId, 'cards', 'tst', '1', 'nonfoil');
  assert.equal((await decks.findDeckByMongoId(a, ownId)).cards[0].proxy, true);
  await decks.setProxyImage(a, ownId, 'cards', 'tst', '1', 'nonfoil', 'https://example.com/proxy.jpg');
  await decks.replaceCardVersion(a, ownId, 'tst', '1', 'new', '2');
  assert.equal((await decks.findDeckByMongoId(a, ownId)).cards[0].set, 'new');
  const before = await snapshot();
  await assert.rejects(decks.makeCardProxy(a, foreignId, 'cards', 'tst', '1', 'nonfoil'), /not found/);
  await assert.rejects(decks.setProxyImage(a, foreignId, 'cards', 'tst', '1', 'nonfoil', 'https://example.com/x.jpg'), /not found/);
  await assert.rejects(decks.replaceCardVersion(a, foreignId, 'tst', '1', 'new', '2'), /not found/);
  await assert.rejects(decks.applyPlannedChange(a, foreignId, 0), /not found/);
  assert.equal(await snapshot(), before);
  session = { user: { id: String(a), username: 'a', permissionLevel: 'user' } };
  const deniedNotes = await route('card-performance').GET(request('/?set=tst&cn=1&deckId=' + foreignId));
  assert.equal(deniedNotes.status, 404);
  await decks.addPlannedChange(a, ownId, 'Test Card', 'Replacement');
  await db.collection('decks').updateOne({ _id: ownDeck }, { $set: { maybeboard: [{ ...baseCard, name: 'Replacement', set: 'rep', cn: '3', quant: 1 }] } });
  await decks.applyPlannedChange(a, ownId, 0);
  assert.equal((await decks.findDeckByMongoId(a, ownId)).cards[0].name, 'Replacement');
  assert.ok((await decks.getDeckOverviews(a)).every(deck => String(deck.userId) === String(a)));
  assert.ok((await cards.getAllCards(a, 'watchlist')).every(card => String(card.userId) === String(a)));
  const gameId = await games.addGame(a, { ...gameInput, deckId: ownId });
  await games.updateGame(a, gameId, { ...gameInput, deckId: ownId, result: 'loss' });
  assert.equal((await games.getDeckOverviewStats(a))[ownId].winPercent, 0);
  assert.equal((await games.getDeckOverviewStats(b))[ownId], undefined);
  await assert.rejects(games.updateGame(a, gameId, { ...gameInput, deckId: foreignId }), /not found/);
  await assert.rejects(games.updateGame(b, gameId, gameInput), /not found/);
});
