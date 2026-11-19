# User isolation and rollout

The Next.js app in this directory retains NextAuth credentials login. Successful
login returns the MongoDB user `_id` as a string, stores it in the JWT `userId`
claim, and exposes `session.user.id`. Old username-only sessions must sign in
again. Server boundaries convert only that claim into an ObjectId; request
bodies, query parameters, deck attribution and permission levels never select
the authenticated owner.

## Audit and compatibility

No AGENTS.md instructions were found in the repository or its parent.

The root Express app is still runnable using its root `npm start`, listens on
port 5000, and has its own credentials/session implementation. Both MongoDB
connection modules use `MONGO_URL` and `DATABASE_NAME`, and both use `users`,
`decks`, and `games`. Their effective deployment environments are not established
by source code, so do not assume that Express is retired or uses a different DB.
Its data/decks.js and data/games.js expose all records and insert records without
ownership. Express game links use Moxfield strings instead of MongoDB deck IDs;
its older deck/game shapes also differ from Next.js. **Do not run that app against
the migrated DB.** Disable its deployment, credentials and ingress before rollout;
retire it or port its ownership checks separately before re-enabling it. The old
Next.js versions and administrative import/enrichment scripts also must not run
concurrently. In particular, `src/scripts/add_fields.js` is a global maintenance
script, not a user-scoped application endpoint. Root `tasks/` imports and root
JSON fixtures need separate review before reuse.

Personal database roots are exactly `decks`, `bulk_cards`, `cool_cards`,
`trade_binder`, `card_watchlist`, and `games`. They carry ObjectId `userId`.
`InventoryCard` requires ownership while embedded `Card` records inherit it from
their deck. Planned changes, tags, deck settings, boards, game snapshots, wins
and losses are embedded, so have no separate root collection. Shared external
Scryfall card/set data stays shared. Deck `owner` was freely entered at creation
and editing; it remains descriptive attribution, labelled that way in the form.
It is never consulted by authorization or migration.

| Surface | Ownership enforcement |
| --- | --- |
| data/cards.ts | Required user argument on reads, exact-version matching, pages, counts, add/remove, finish changes, owned versions and transfers; destination matching is within that user's inventory |
| data/decks.ts | Required user argument on lists, ID lookups, settings, main deck per identity, tags, bulk replacement, board moves, proxy replacement and planned changes |
| data/games.ts | Required user argument on history, filters, deletes and snapshot updates; new deck links require an owned deck before insertion; statistics operate on the scoped history |
| /api/collection/[collection_type]/add_card, card_page, card_page/[page] | Session required; user passed into data layer, including decks+ID targets |
| /api/collection/[collection_type]/search/[search_terms] | Session required; direct MongoDB search combined with mandatory ownership |
| /api/collection/card_deck_usage | Session required; direct deck query restricted before constructing usage report |
| /api/collection/change_foil, remove_card, transfer_card, stats/total_card_count | Session required; scoped mutations and aggregation |
| /api/decks/all_decks, add_deck, [deck_id], [deck_id]/settings | Session required; scoped reads and writes |
| /api/decks/[deck_id]/change_tags, move_card, replace_cards, replace_proxy, planned_changes | Session required; deck and inventory IDs checked within the current user's scope before writes |
| /api/decks/[deck_id]/available_proxies, owned_versions | Owned deck required; direct inventory queries and owned-version queries are scoped |
| /api/decks/proxy_report | Direct queries on decks and all three inventory roots are scoped before grouping/search |
| /api/games, /api/games/[game_id] | Session required for history, stats, insertion and deletion |
| /api/scryfall/card_lookup | Existing sign-in requirement retained, now requires the stable ID |
| /decks/**, /collection/**, /games/** | Server layouts redirect missing/legacy sessions to login; client account boundary unmounts personal state on account changes |

All single-record filters combine ownership with the record ID, and all list and
aggregation filters require ownership. Missing or malformed ownership never
matches. Missing and foreign records have the same response behavior. A global
owner role grants no cross-account access. All three existing roles (`owner`,
`user`, `collection-recorder`) can manage their own data. Collection recorders
lose implicit access to the primary account's inventory and instead see their
own empty inventory until they add records. Delegation is not implemented.

Personal responses have private/no-store cache headers and dynamic handlers.
The client account boundary discards personal component state across logout or
account changes, including in-flight responses targeting old components.
Watchlist grouping cookies are keyed by the authenticated ID; the former shared
cookie is ignored. Login/logout retain NextAuth's redirect and cross-tab session
refresh behavior. No public registration, recovery, sharing, or role bypass was
introduced.

The existing progress-bar count intentionally retains its original meaning:
bulk plus cool cards, excluding watchlists, trade binder, and deck contents.
Those two aggregations are now restricted to the current user.

## Backup and rollout

1. Identify the production database and exact existing username receiving legacy
   data. Do not infer it from deck attribution, environment files or fixtures.
2. Disable Express, old Next.js deployments, scheduled writers, imports and
   maintenance scripts. Keep writes stopped throughout migration/index review.
   Revoke old DB access if necessary. Take a consistent full MongoDB backup,
   including users and indexes, and verify restore on an isolated instance.
3. From this directory, set `MONGO_URL` securely to the chosen environment, then
   run the read-only plan (an explicit database is mandatory):

   ```sh
   npm run migrate:ownership -- --owner EXISTING_USERNAME --database DATABASE
   ```

   The output identifies the resolved account ID, total/missing/owned counts per
   collection, ownership/link issues, blocking global unique indexes, and proposed
   scoped indexes. This command does not assign ownership or create indexes.
   It reads personal roots into memory for a complete link audit; use an adequate
   maintenance host for large databases.
4. Review malformed ownership (including null/string IDs), owners absent from
   users, and dangling/cross-user/malformed game links. Old Express links require
   an explicit mapping to MongoDB decks or an explicit decision to unlink them;
   the script does not guess. Already-owned records remain untouched. Records
   with missing ownership are planned for the explicitly selected account only.
5. Review any unique index without `userId` (other than `_id_`). The script blocks
   apply rather than dropping indexes automatically. After reviewing uniqueness,
   collation, partial/sparse settings and existing duplicates, create the desired
   user-scoped replacement and drop the incompatible global index during the
   maintenance window. Re-run the dry-run until there are no issues/blockers.
6. Obtain explicit approval for the production write migration. Only then run:

   ```sh
   npm run migrate:ownership -- --owner EXISTING_USERNAME --database DATABASE --apply
   ```

   Apply assigns only `{ userId: { $exists: false } }`, preserving existing IDs,
   and adds non-unique scoped indexes for pagination, version matching, names,
   deck card usage, formats/identity and game history/deck filters. It is safe to
   rerun after interruption; no records are removed. The operation is not a single
   transaction across all collections. Keep writers stopped and rerun if an
   index or network operation fails. Do not roll back by globally unsetting IDs.
7. Run the dry-run again: missing counts should be zero and issues empty. Deploy
   only the new Next.js version, require everyone to sign in again, and smoke-test
   the selected legacy owner and a separate empty account. Confirm proxy reports,
   card counts, watchlists, games and settings. Re-enable only updated writers.
8. For rollback, keep ingress and writers disabled. Restore the verified backup
   and corresponding application version together in an isolated recovery window.
   Never expose an old unscoped app to the migrated multi-user dataset.

## Validation

```sh
npm test
npm run typecheck
npm run build
```

The integration suite downloads/starts a disposable MongoDB 7.0.24 through
`mongodb-memory-server` and never uses the application's configured database.
It executes the real data functions and API handlers, substituting only the
session provider. It covers two users, equivalent inventory, foreign IDs,
transfers, proxy replacements, game links, search, reports, counts/statistics,
all unauthenticated/legacy API handlers, ownership gaps and migration reruns.
First execution needs internet access to download the MongoDB binary. The build
also needs Google Fonts access for the existing next/font setup.

The repository's standalone `npm run lint` opens the Next.js ESLint setup prompt
because it has no ESLint configuration. No new lint configuration is introduced
by this change; typecheck and production build can run independently.

Production migration has not been run. The account, target database/environment,
backup confirmation, old-writer shutdown, dry-run review and explicit write
approval are deployment inputs still needed.
