# United Flag Football — Cloudflare deployment

This version is prepared for Cloudflare Workers + D1. The `public/` folder is deployed as Static Assets, while the app's persistent JSON state is stored in the D1 `app_state` table. Cloudflare's Worker filesystem is temporary, so the old JSON-file persistence is not used for league data.

## 1. Create the D1 database

Install Node.js, then from this project folder run:

```bash
npx wrangler login
npx wrangler d1 create united-flag-football
```

When Wrangler gives you a database ID, open `wrangler.jsonc` and replace:

```json
"database_id": "REPLACE_WITH_YOUR_D1_DATABASE_ID"
```

with the real ID.

## 2. Create the table

```bash
npx wrangler d1 execute united-flag-football --remote --file=./schema.sql
```

## 3. Deploy once, then copy your data over

Do this BEFORE shutting down the Render service. First run `npm install` and `npm run deploy` (step 6) so the Cloudflare site exists, then:

```bash
node scripts/import-data.mjs https://gridiron-rbx.onrender.com https://YOUR-WORKER.workers.dev YOUR_ADMIN_PASSWORD
```

This downloads the current `/api/data` from Render, keeps a backup in `migrations/render-data.json`, and saves it into D1 through the new site's admin API. (Loading a big data file with an SQL file can fail because D1 limits one SQL statement to 100 KB. The old `export-render-data.mjs` script is still there but is no longer the recommended way.)

Not copied by this step: admin accounts, Legacy settings, the Discord webhook and the transactions feed. Re-add the admin accounts and webhook in Admin; Legacy and transactions refill themselves from the sheet and Discord.

D1 stores at most 2 MB in a single row, and all league data is one row. Very large team logos (stored as images inside the data) are the usual cause of going over. Upload smaller logos if the import warns about size.

## 4. Add Cloudflare secrets

Do not put these in GitHub or inside `wrangler.jsonc`:

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put DISCORD_BOT_TOKEN
npx wrangler secret put DISCORD_GUILD_ID
```

Optional:

```bash
npx wrangler secret put DISCORD_TX_CHANNEL_ID
npx wrangler secret put LEGACY_CSV_URL
```

`DISCORD_GUILD_ID` is the Discord server ID for United Flag Football. It is not the invite code.

## 5. Test locally (optional)

```bash
npm install
npm run dev
```

Wrangler will provide a local URL.

## 6. Deploy (do this before step 3)

```bash
npm run deploy
```

Cloudflare will give you a `workers.dev` URL.

## Important

Keep the Render site running until the Cloudflare version has been tested. The Cloudflare project is intentionally configured as a separate deployment so you can switch over safely.

## What works differently on Cloudflare

- The compatibility flag `nodejs_compat` (already in `wrangler.jsonc`) is required. Without it the Worker will not start.
- Several copies of the Worker can run at once, so each one re-reads D1 every 5 seconds. After the admin saves, other visitors may see the old data for up to about 5 seconds.
- Background timers do not exist on Workers. The 5-minute Discord ranking-role sync and the Discord transactions channel poll no longer run by themselves. Use Admin > Legacy > Sync roles now and Admin > Transactions > Sync now, or the Transactions page, which re-reads the channel when opened. Legacy re-reads its sheet when someone opens the Legacy page.
- Your admin password is read from the `ADMIN_PASSWORD` secret. If you skip that secret, the old default in server.js is used, so set it.
