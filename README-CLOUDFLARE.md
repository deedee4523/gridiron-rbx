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

## 3. Preserve the data currently on Render

Do this BEFORE shutting down the Render service:

```bash
node scripts/export-render-data.mjs https://gridiron-rbx.onrender.com
npx wrangler d1 execute united-flag-football --remote --file=migrations/render-data.sql
```

The first command saves the current `/api/data` response. The second puts it into D1 under `data.json`.

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

## 5. Test locally

```bash
npm install
npm run dev
```

Wrangler will provide a local URL.

## 6. Deploy

```bash
npm run deploy
```

Cloudflare will give you a `workers.dev` URL.

## Important

Keep the Render site running until the Cloudflare version has been tested. The Cloudflare project is intentionally configured as a separate deployment so you can switch over safely.
