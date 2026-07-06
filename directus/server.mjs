import http from 'node:http';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bin = join(__dirname, 'node_modules', '.bin', 'directus');
const DIRECTUS_PORT = 18055;
const PROXY_PORT = parseInt(process.env.PORT || '3000');

// Directus auf festem internen Port starten (kein Konflikt mit alten Prozessen)
const proc = spawn(bin, ['start'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: { ...process.env, PORT: String(DIRECTUS_PORT), WORKERS: '1' },
});

proc.on('exit', (code) => process.exit(code ?? 0));
proc.on('error', (err) => { console.error(err); process.exit(1); });
process.on('SIGTERM', () => proc.kill('SIGTERM'));
process.on('SIGINT',  () => proc.kill('SIGINT'));

// Proxy: Passenger-Port → Directus-Port (mit Retry während Directus startet)
function proxyRequest(req, res, retries = 8) {
  const opts = {
    hostname: '127.0.0.1',
    port: DIRECTUS_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${DIRECTUS_PORT}` },
  };
  const proxyReq = http.request(opts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on('error', () => {
    if (retries > 0) {
      setTimeout(() => proxyRequest(req, res, retries - 1), 2000);
    } else {
      res.writeHead(503);
      res.end('Directus startet noch, bitte kurz warten.');
    }
  });
  req.pipe(proxyReq, { end: true });
}

const server = http.createServer(proxyRequest);
server.listen(PROXY_PORT);
