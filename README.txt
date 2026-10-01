United Flag Football

Cloudflare deployment instructions are in README-CLOUDFLARE.md.
The original Node/HTTP server is retained and is bridged into Cloudflare Workers using the current Cloudflare Node HTTP integration.
Persistent league/admin/legacy state is stored in D1 instead of the ephemeral Worker filesystem.
