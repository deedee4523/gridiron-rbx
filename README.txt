United Flag Football League

This build is configured as a dependency-free Node app. It does not require npm install.

Replit:
1. Import the ZIP.
2. Press Run.
3. Replit starts `node server.js` automatically.
4. The public site is in public/index.html.
5. Admin data is stored in data.json.

Admin passcode is set in server.js (ADMIN_PASSWORD). Change it if needed.

All Flag teams (added):
- Public: Awards page > "All Flag teams" (1st gold / 2nd silver / 3rd bronze, Offense + Defense).
- Admin: Admin > "All Flag teams". Pick each spot by hand, or leave it on Auto (best remaining by fantasy pts;
  DE ranked by sacks, LB by tackles). Each season keeps its own teams.
- Player names show their team logo; player profiles use the team's colors and list their All Flag medals.

Join server + player profile extras:
- The "Join server" button in the header opens the league Discord (discord.gg/uff).
- Player profile shows Awards, Previous roles (from earlier seasons' stats) and All Flag honors.

Admin changes:
- Player editor: the normal Add player form, plus "Award roles" for any saved player (tick an award to make them
  that season's winner; untick to go back to Auto). Use the season bar to edit other seasons.
- Playoffs tab: add any number of rounds and games, pick teams, type scores, choose who advances, then
  "Send winners to next round". Shows on the public Playoffs page.
- Schedule: team names that are not found are created as real teams (imports, Save schedule, and a
  "+ New team..." option in the team pickers). Edit them in Admin > Teams.
- Form layout class renamed from ad-grid to fm-grid (ad blockers hide "ad-" names, which blanked the forms).

New look (matches the uffstats style):
- Brand header with big UNITED FLAG / FOOTBALL logo, search bar and season picker.
- Home is now a dashboard: Teams / Week / Series / Playoffs / #1 Seed tiles, Top performers, Power rankings,
  Award race, Conference leaders, Quick access and Recent games.
- Navigation is a floating icon dock at the bottom (the ... button holds VODs, Awards, Rulebook, Stats, Admin).
- "Join server" is a pill at the bottom left and opens the Discord.
- Awards and All Flag teams live on the Awards page (#/awards).
- Accent color changed to lime, with a blue glow at the top of the page.


Legacy (new source options):
- Admin > Legacy > Data source: paste a Google Sheets / Google Docs (with a table) / Google Drive / direct .ods, .xlsx or .csv link,
  or upload an .ods / .xlsx / .csv file. The sheet needs a header row with Player and Score (optional: UFB, MVP, PA, VA, 1ST, 2ND,
  Crowns, Titles, CC, FO). A row that says HALL OF FAME above the inductees puts them in that tier.
- Google links must be shared as "Anyone with the link can view". Linked sources are re-read every 5 minutes; uploads are stored as-is.
- Achievement Tracker counts career totals (all seasons).

Deploying without losing data (important on Render):
- data.json is NOT included in this zip on purpose, so deploying does not overwrite your live players/games.
- Render wipes files on every deploy unless you attach a Persistent Disk. Add a disk (e.g. mounted at /var/data) and set the
  environment variable DATA_DIR=/var/data. data.json, legacy settings and admin accounts are then stored there and survive deploys.


Legacy look, Crowns & Titles, Discord ranking roles (latest):
- Legacy page is drawn like the league's legacy spreadsheet: coloured tier banners (Hall of Fame, Ultra, Legend, Superstar,
  Specialist, Veteran, AllPro, Pro), a rank swatch, and tinted boxes for UFB / MVP / PA / VA / 1ST / 2ND / CROWNS / TITLES / CC / FO
  with their XP values on top. The numbers (score, tier) still come from the sheet exactly as before.
- Awards page now has "Crowns & Titles" in the Discord style. Crown = leads EVERY stat category of a position
  (QB, RB, WR, TE, DB, LB, DE). Title = leads ONE category (e.g. interceptions in DB). A player with a position's crown
  does not also get that position's titles. Computed from the selected season's stats. "Copy for Discord" copies the post.
  Admin > Crowns & Titles lets you override or hide any single crown/title per season (stored in data.json as crownWin).
  The categories are listed at the top of public/crowns.js (POS) if you want to change which stats count.
- Discord ranking roles (server-side, discord-roles.js). One-time setup:
    1. discord.com/developers > New Application > Bot. Turn ON "Server Members Intent". Copy the bot token.
    2. Invite the bot to your server with the "Manage Roles" permission.
    3. In Server Settings > Roles drag the bot's role ABOVE the rank roles (the roles are created for you on the first sync).
    4. Set environment variables DISCORD_BOT_TOKEN and DISCORD_GUILD_ID (Replit: Tools > Secrets; Render: Environment). Restart.
  Then Admin > Legacy > "Discord ranking roles": "Preview changes" shows what would happen, "Sync roles now" applies it.
  After that it runs by itself every 5 minutes whenever someone's tier changes (and a full check every 30 minutes).
  Players are matched to Discord members by nickname / display name / username; a nickname like "Zach (@exanious)" matches
  "exanious". Add "robloxname = discord username or ID" lines in the admin box for anyone who can't be matched.
  Only the 8 rank roles are ever added or removed. Settings and links are stored in legacy-discord.json (inside DATA_DIR).

Update: Legacy is back to the normal dark layout, with only three tier headings coloured (Hall of Fame yellow, AllPro pink, Pro black).
Discord roles now also include "Crown" and "Title" roles (everyone who currently holds a crown / title gets the role, and loses it
when they lose it). Admin > Legacy > Discord ranking roles has "Create rank + Crown + Title roles" and a box to create any other role
(name + hex colour). The crown/title holder list is sent to the server whenever you save Crowns & Titles or press Preview / Sync in
that box, and is then used by the automatic 5-minute check.


Update: Legacy tier headings are now Hall of Fame yellow, AllPro pink, Veteran light blue and Pro black (everything else stays the normal dark look).
Discord roles use the same colours: Hall of Fame #ffec20, AllPro #fba2f9, Veteran #7ae2ff, Pro #110a0a. Existing roles that already exist on your server keep their old colour; the sync now recolours the tier roles to match.


Update (Crowns & Titles look, auto candidates, Legacy history):
- Crowns & Titles now use the site's own cards and colours (no Discord look, no copy button).
- Award candidates and All Flag teams are AUTO by default: every season fills itself from its stats, nobody needs a role or a pick.
  Award cards also list the next two candidates. Admin can still pick winners by hand, or untick the Auto boxes to turn it off
  (stored as awardOff / afOff in data.json, so older saved settings no longer block auto).
- Legacy page: new "Victory Bowl history" (each season's playoff champion and final score, from Admin > Playoffs) and
  "Award history" (each season's award winners). Tier banners: Ultra green, Legend yellow, Superstar purple, Specialist orange
  (Discord tier roles use the same colours).

Update: Crowns & Titles now also show candidates (Awards page). "Crown candidates" lists the top 3 per position by how many of its
categories they lead (with their numbers); "Title candidates" lists the top 3 in every title category. All automatic from the season's stats.

Update: Interactive style (public/fx.js, loaded last in index.html). Pages fade/slide in and cards reveal in sequence as you scroll,
numbers count up, bars fill, cards tilt toward the cursor with a soft light, buttons ripple, the dock icons grow on hover, dialogs
pop open, a progress bar runs along the top, a back-to-top button appears, and "/" jumps to search. It is skipped on the Admin page
and turns itself off when the device asks for reduced motion. To remove it, delete the fx.js line in index.html.

Update: Player profile now shows the player's Legacy role (Hall of Fame / Ultra / Legend / Superstar / Specialist / Veteran / AllPro / Pro),
their legacy rank and score in a pill under their name, beside the headshot. It uses the tier colours and links to the Legacy page. Players are
matched to the legacy sheet by name (a trailing "(@discord)" is ignored); unranked or unmatched players show nothing.

Fix: candidates were still empty because browsers kept the old admin.js (the server caches scripts for an hour). Script versions are bumped,
and Awards / All Flag no longer depend on admin.js for the auto setting. If a season has no recorded stats, the cards now say so instead of "No candidate yet".

Update: CANDIDATES ONLY. Nothing is awarded automatically any more.
- Awards page: award cards, Crowns & Titles and All Flag show ranked CANDIDATES from the season's stats (All Flag: top players for QB, RB, TE, WR, DB, LB, DE).
- Only picks the admin makes by hand count as real: Admin > Awards winners, Admin > Crowns & Titles overrides and Admin > All Flag teams picks.
  Those then show as "Selected by the league" / "Crowned by the league", on player profiles, in Legacy > Award history, and (crowns/titles) in Discord roles.
- Player profiles no longer show awards or All Flag medals unless the admin picked them. The Discord Crown/Title roles are only given for admin-picked crowns/titles.
