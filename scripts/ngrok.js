#!/usr/bin/env node
const { spawn } = require('child_process');
const http = require('http');
const dotenv = require('dotenv');

dotenv.config();

const token = process.env.NGROK_AUTH_TOKEN;
const port = process.env.PORT || 3001;

if (!token) {
  console.error('Missing NGROK_AUTH_TOKEN in .env');
  process.exit(1);
}

function fetchTunnelUrl(attempt = 0) {
  if (attempt >= 15) return;

  const req = http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      try {
        const data = JSON.parse(body);
        const tunnel = (data.tunnels || []).find((t) => t.proto === 'https');
        if (tunnel?.public_url) {
          console.log(`\nPublic URL: ${tunnel.public_url}`);
          console.log(
            `Webhook:    ${tunnel.public_url}/api/transactions/webhook/cashfree`
          );
          console.log(`Set in .env: PUBLIC_API_BASE_URL=${tunnel.public_url}\n`);
          return;
        }
      } catch (_) {
        // ngrok API not ready yet
      }
      setTimeout(() => fetchTunnelUrl(attempt + 1), 1000);
    });
  });

  req.on('error', () => {
    setTimeout(() => fetchTunnelUrl(attempt + 1), 1000);
  });
}

console.log(`Starting ngrok tunnel → http://localhost:${port}`);

const child = spawn('ngrok', ['http', String(port)], {
  stdio: 'inherit',
  env: { ...process.env, NGROK_AUTHTOKEN: token },
});

fetchTunnelUrl();

child.on('exit', (code) => process.exit(code ?? 0));
