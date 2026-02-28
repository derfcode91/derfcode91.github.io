# Spotify auto-update (real-time vibe for visitors)

The GitHub Action **Update Spotify vibes** runs **daily** and updates `data/spotify-vibes.json` with your top artists and most played tracks. Visitors then see your card without logging in.

## One-time setup

### 1. Get a refresh token

You need a **refresh token** so the Action can get a new access token each run (Spotify access tokens expire after 1 hour).

**Option A – From your website (no localhost, recommended)**  
1. Open **https://derfcode91.github.io/my-vibes.html** (or your live My Vibes page).  
2. Click **Connect Spotify** and log in with your account.  
3. After your card loads, scroll down. If a **“For daily auto-update”** section appears with a long token, click **Copy** and use that as the refresh token.  
4. If you don’t see that section, click **Try again** then **Connect Spotify** once more (Spotify sometimes sends the refresh token on the first authorization).

**Option B – Local script (if your dashboard allows localhost)**  
1. In [Spotify Dashboard](https://developer.spotify.com/dashboard) → your app → **Edit Settings** → **Redirect URIs** add `http://localhost:3000/callback` and save.  
2. Run: `SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/get-spotify-refresh-token.js`  
3. Log in in the browser and copy the printed refresh token.

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
