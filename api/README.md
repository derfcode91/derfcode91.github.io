# EPL standings proxy (fixes "Failed to fetch" / CORS on GitHub Pages)

1. **Deploy this project to Vercel** (or only the `api` folder):
   - Go to [vercel.com](https://vercel.com), sign in with GitHub, and import this repo.
   - In the project **Settings → Environment Variables**, add:
     - Name: `FOOTBALL_DATA_API_KEY`
     - Value: your token from [football-data.org](https://www.football-data.org/)
   - Deploy. Note the URL (e.g. `https://your-project.vercel.app`).

2. **In `my-vibes.html`** set the proxy URL:
   ```js
   window.EPL_PROXY_URL = 'https://your-project.vercel.app/api/epl-standings';
   ```
   Leave `FOOTBALL_DATA_API_KEY` in the HTML empty if you use the proxy (the key stays on Vercel).

Your GitHub Pages site will then load the table by calling the proxy; the proxy calls football-data.org with the key, so the browser never hits CORS.
