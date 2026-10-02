# United Flag Football on Railway

This is a plain Node app (no npm install needed). League data is saved as files in a **Railway Volume**, which is a disk that keeps its contents through restarts, sleeping and redeploys.

## Setup

1. Put these files in a GitHub repo (the repo root should contain `server.js`, `package.json`, `railway.json` and the `public` folder).
2. On railway.com: **New Project -> Deploy from GitHub repo**, and pick the repo.
3. **Attach a Volume** (this is the step that keeps your data):
   - On the project canvas, right-click the service (or press Ctrl+K) and choose to add a Volume.
   - Set the mount path to `/data` and attach it to your service.
   - Railway automatically gives the app the `RAILWAY_VOLUME_MOUNT_PATH` variable, and the app saves everything there. Nothing else to set.
4. Open the service -> **Variables** and add:
   - `ADMIN_PASSWORD` = your own admin password (required, otherwise the default from the source code is used)
   - Optional, for Discord: `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_TX_CHANNEL_ID`
5. Open the service -> **Settings -> Networking -> Generate Domain**. That is your public link. You can change its name there too.
6. Wait for the deploy to finish, open the link, and log in to Admin.

## Checking that data is kept

Open the service's **Logs**. On start-up you should see `Data folder: /data`. If you see a WARNING that no Volume is attached, data is NOT being kept: attach the Volume and redeploy.

To test it: add a team in Admin, click **Restart** or redeploy in Railway, and the team should still be there.

## Notes

- Keep the service on **one replica**. A volume belongs to a single instance.
- Leave Railway's **App Sleeping** setting off if it is offered. Data survives sleeping because it is on the volume, but visitors would wait a few seconds for the first page after a sleep.
- The previous save is kept as `data.json.bak` on the volume. If `data.json` is ever unreadable, the site reads the backup.
- Saves are written to a temporary file first and then swapped in, so a restart in the middle of a save cannot corrupt the file.
- The public link `/api/data` returns all league data as JSON. You can open it and save the page as a backup copy any time. To restore, Admin has a "Copy this browser's data to the server" button, or send the JSON to `PUT /api/data` with your admin password.
- Railway is not fully free: new accounts get a trial credit, then a small monthly plan applies. Check railway.com/pricing.
