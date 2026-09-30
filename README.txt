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
