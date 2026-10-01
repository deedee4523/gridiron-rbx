// Cloudflare Workers entry point.
import { env } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';

globalThis.__UFF_CF_ENV = env;

await import('./server.js');

export default httpServerHandler({ port: 3000 });
