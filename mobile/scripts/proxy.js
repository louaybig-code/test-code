/**
 * Local CORS proxy for BROWSER testing of the StudioPilot mobile web build.
 *
 * Why: the web build calls https://studiopilote.fr directly. Native apps
 * don't care about CORS, but browsers do — if the API doesn't whitelist
 * your dev origin (localhost / LAN IP / preview domain), every request
 * fails with a "Network Error". This tiny proxy forwards requests to the
 * real API and adds permissive CORS headers, so the browser build works
 * exactly like the native app.
 *
 * Usage:
 *   node scripts/proxy.js                      # listens on :8081
 *   PORT=9000 node scripts/proxy.js            # custom port
 *
 * Then start Expo with:
 *   EXPO_PUBLIC_API_BASE_URL=http://localhost:8081 npx expo start --web
 * (or your LAN IP instead of localhost if you test from another device)
 */
const http = require('http');
const https = require('https');

const TARGET_HOST = process.env.TARGET_HOST || 'studiopilote.fr';
const PORT = Number(process.env.PORT || 8081);

const server = http.createServer((req, res) => {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers'] || 'Content-Type,Authorization'
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const options = {
      hostname: TARGET_HOST,
      port: 443,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: TARGET_HOST,
        origin: `https://${TARGET_HOST}`,
        referer: `https://${TARGET_HOST}/`,
        'content-length': body.length || undefined,
      },
    };
    delete options.headers['access-control-request-headers'];
    delete options.headers['access-control-request-method'];

    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, {
        ...proxyRes.headers,
        'Access-Control-Allow-Origin': req.headers.origin || '*',
      });
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
    });
    if (body.length) proxyReq.write(body);
    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`\n  StudioPilot CORS proxy → https://${TARGET_HOST}`);
  console.log(`  Listening on http://0.0.0.0:${PORT}`);
  console.log(`\n  Start the app with:`);
  console.log(`  EXPO_PUBLIC_API_BASE_URL=http://localhost:${PORT} npx expo start --web\n`);
});
