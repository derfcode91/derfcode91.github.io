#!/usr/bin/env node
/**
 * Fetches your Spotify top artists and tracks and writes data/spotify-vibes.json.
 * Used by the GitHub Action for auto-update. Needs env:
 *   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN
 */

const fs = require('fs');
const path = require('path');

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

if (!clientId || !clientSecret || !refreshToken) {
  console.error('Missing env: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN');
  process.exit(1);
}

async function getAccessToken() {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error('Token refresh failed: ' + res.status + ' ' + err);
  }
  const data = await res.json();
  return data.access_token;
}

async function apiGet(url, token) {
  const res = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!res.ok) throw new Error('API ' + res.status + ' ' + url);
  return res.json();
}

async function main() {
  const token = await getAccessToken();
  const [me, artistsRes, tracksRes] = await Promise.all([
    apiGet('https://api.spotify.com/v1/me', token),
    apiGet('https://api.spotify.com/v1/me/top/artists?limit=6&time_range=short_term', token),
    apiGet('https://api.spotify.com/v1/me/top/tracks?limit=6&time_range=short_term', token),
  ]);

  const data = {
    displayName: me.display_name || '',
    artists: artistsRes.items || [],
    tracks: tracksRes.items || [],
  };

  const outPath = path.join(__dirname, '..', 'data', 'spotify-vibes.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
  console.log('Wrote', outPath, '| artists:', data.artists.length, '| tracks:', data.tracks.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
