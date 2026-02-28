# Spotify auto-update (real-time vibe for visitors)

The GitHub Action **Update Spotify vibes** runs **daily** and updates `data/spotify-vibes.json` with your top artists and most played tracks. Visitors then see your card without logging in.

## One-time setup

### 1. Get a refresh token

You need a **refresh token** so the Action can get a new access token each run (Spotify access tokens expire after 1 hour).

1. In [Spotify Dashboard](https://developer.spotify.com/dashboard) → your app → **Edit Settings** → **Redirect URIs**  
   Add: `http://localhost:3000/callback`  
   Save.

2. In a terminal (from the repo root):

   ```bash
   # Windows (PowerShell)
   $env:SPOTIFY_CLIENT_ID="your-client-id"; $env:SPOTIFY_CLIENT_SECRET="your-client-secret"; node scripts/get-spotify-refresh-token.js

   # Mac/Linux
   SPOTIFY_CLIENT_ID=your-client-id SPOTIFY_CLIENT_SECRET=your-client-secret node scripts/get-spotify-refresh-token.js
   ```

   Use the **Client ID** and **Client Secret** from your app’s dashboard.

3. A browser window will open. Log in with Spotify and approve. The script will print a **refresh token** (and show it in the browser). Copy it.

4. (Optional) Remove `http://localhost:3000/callback` from Redirect URIs in the dashboard if you don’t need it anymore.

### 2. Add GitHub secrets

In your repo: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Add:

| Secret name               | Value                    |
|---------------------------|--------------------------|
| `SPOTIFY_CLIENT_ID`       | Your Spotify app Client ID |
| `SPOTIFY_CLIENT_SECRET`   | Your Spotify app Client Secret |
| `SPOTIFY_REFRESH_TOKEN`   | The refresh token from step 1 |

### 3. Run the Action once

Go to **Actions** → **Update Spotify vibes** → **Run workflow**. After it runs, `data/spotify-vibes.json` will be updated and pushed. Your site will then show your card to visitors.

After that, the workflow runs **every day at 08:00 UTC**. You can also trigger it manually from the Actions tab anytime.
