#!/usr/bin/env node
/**
 * One-time script to get a Spotify refresh token for the GitHub Action.
 * Run: SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/get-spotify-refresh-token.js
 *
 * Before running:
 * 1. In Spotify Dashboard → your app → Edit Settings → Redirect URIs:
 *    Add: http://localhost:3000/callback
 * 2. Save, then run this script.
 * 3. After you see the refresh token, add it (and client id/secret) to GitHub repo Secrets.
 */

const http = require('http');
const { execSync } = require('child_process');

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const port = 3000;
const redirectUri = `http://localhost:${port}/callback`;
const scopes = 'user-top-read user-read-private';

if (!clientId || !clientSecret) {
  console.error('Usage: SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/get-spotify-refresh-token.js');
  process.exit(1);
}

const authUrl =
  'https://accounts.spotify.com/authorize?' +
  new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes,
    show_dialog: 'true',
  }).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (url.pathname !== '/callback') {
    res.writeHead(302, { Location: authUrl });
    res.end();
    return;
  }

  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing code in callback. Try again.');
    server.close();
    return;
  }

  let refreshToken = null;
  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });
    const data = await tokenRes.json();
    if (!tokenRes.ok) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        '<body style="font-family:sans-serif;padding:2rem;"><h1>Token exchange failed</h1><pre>' +
          JSON.stringify(data, null, 2) +
          '</pre></body>'
      );
      server.close();
      return;
    }
    refreshToken = data.refresh_token;
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error: ' + e.message);
    server.close();
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(
    '<body style="font-family:sans-serif;padding:2rem;max-width:600px;">' +
      '<h1>Refresh token</h1>' +
      '<p>Copy the value below and add it to GitHub repo <strong>Secrets and variables → Actions</strong> as <code>SPOTIFY_REFRESH_TOKEN</code>.</p>' +
      '<textarea readonly style="width:100%;height:80px;font-size:12px;">' +
      refreshToken +
      '</textarea>' +
      '<p>Also add <code>SPOTIFY_CLIENT_ID</code> and <code>SPOTIFY_CLIENT_SECRET</code> if not already set. You can close this tab.</p>' +
      '</body>'
  );
  server.close();

  console.log('\nRefresh token (also shown in browser):');
  console.log(refreshToken);
  console.log('\nAdd it to GitHub → Settings → Secrets and variables → Actions → SPOTIFY_REFRESH_TOKEN\n');
});

server.listen(port, () => {
  console.log('Open this URL in your browser, log in with Spotify, then you will get the refresh token:\n');
  console.log(authUrl);
  console.log('\nWaiting for callback...\n');
  try {
    if (process.platform === 'darwin') execSync('open "' + authUrl + '"');
    else if (process.platform === 'win32') execSync('start "" "' + authUrl + '"');
    else execSync('xdg-open "' + authUrl + '"');
  } catch (_) {}
});
