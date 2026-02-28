/**
 * Vercel serverless function: fetches EPL standings from football-data.org.
 * Deploy this repo to Vercel and set env var FOOTBALL_DATA_API_KEY in the dashboard.
 * Then in my-vibes.html set: window.EPL_PROXY_URL = 'https://your-app.vercel.app/api/epl-standings';
 */

const API_URL = 'https://api.football-data.org/v4/competitions/PL/standings';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) {
    return res.status(500).json({ message: 'Server missing FOOTBALL_DATA_API_KEY' });
  }

  try {
    const r = await fetch(API_URL, {
      headers: { 'X-Auth-Token': key },
    });
    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json(data);
    }
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ message: e.message || 'Upstream request failed' });
  }
}
