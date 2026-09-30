1. On replit.com create a new Node.js Repl (or open your existing one).
2. Upload these files, keeping the folder layout:
     package.json
     server.js
     public/index.html
     public/admin.js
3. The admin passcode is set in server.js (ADMIN_PASSWORD, currently UFF99234). Change it there if you ever need a new one.
4. In the Shell run:  npm install
5. Press Run. Open the site and click "Admin" in the footer (or go to /#/admin).
6. To load the schedule from a file: Admin > Schedule > "Choose .ods file" (one tab per series, WEEK 1 / WEEK 2 headers; old MATCH ONE / MATCH TWO headers become weeks automatically).
Admin data is saved to data.json next to server.js.

Seasons / awards / fantasy: Admin now has Seasons, Awards and Fantasy scoring tabs, and a season bar on every panel. Old single-season data is moved into the current season automatically on first load.

Weeks: schedule matches are now weeks. Default layout is Series I = weeks 1-2, Series II = weeks 3-4, Series III = weeks 5-6. Every week number can be changed in Admin > Schedule.
Stat adder: team names in a recap are matched to your real teams even with typos, nicknames, cities or codes. "Team A / Team B" recaps are matched by the players' rosters or the schedule week, and every match can be changed in the preview before saving. Adding the stats sets the schedule score (by week), standings, team records and box score.

Live: Admin > Live streams. Paste a Twitch channel link, or a YouTube video/stream link (or youtube.com/channel/UC... link). It shows on the public Live page. Remove it when the broadcast ends.
VODs: Admin > VODs. Paste YouTube highlight links or Twitch past broadcast (twitch.tv/videos/...) / clip links. They show on the new public VODs page with Highlights / Past broadcasts filters.
Stats never create new teams: a team name that cannot be matched must be picked (or skipped) in the preview. Player stats are shown in each game's box score once the recap is added.

Stat adder recap formats: both "TEAM 36 - 32 TEAM" and "TEAM 36 - TEAM 32" score lines work. "Player of the Game" is saved and shown in the box score. If a "TEAM Stats" block is named after a team that is not in the score line, it is paired with the score-line team by order and flagged "guessed" in the preview so you can correct it.
Schedule: recap games are always linked to the schedule game for the same two teams (this week first). With Google Sheets auto-sync on, recap games that are not on the sheet are kept beside it. Saving the schedule by hand turns auto-sync off so the sheet cannot overwrite your edits.

Recorded games: Admin > Stat adder now lists every recap for the season under the preview, showing whether it is on the schedule. "Remove" takes a recap's stats back out (and removes players that recap created). Adding a recap for the same two teams and week REPLACES the earlier one instead of counting it twice, and repeated open games for the same two teams in one week are cleaned up automatically.
