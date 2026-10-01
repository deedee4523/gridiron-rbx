// Cloudflare Workers entry point.
// The existing app remains a Node-style HTTP server; Cloudflare's current
// Node compatibility layer bridges it to the Workers request model.
import { httpServerHandler } from 'cloudflare:node';
import './server.js';

export default httpServerHandler({ port: 3000 });
