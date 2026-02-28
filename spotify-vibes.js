(function () {
    var CLIENT_ID = (typeof window !== 'undefined' && window.SPOTIFY_CLIENT_ID) ? String(window.SPOTIFY_CLIENT_ID).trim() : '';
    var REDIRECT_URI = (typeof window !== 'undefined' && window.SPOTIFY_REDIRECT_URI) ? String(window.SPOTIFY_REDIRECT_URI).trim() : '';
    var SCOPES = 'user-top-read user-read-private';
    var STORAGE_KEY = 'spotify_vibes_token';
    var PKCE_VERIFIER_KEY = 'spotify_vibes_code_verifier';

    var RADAR_LABELS = [
        'acousticness',
        'danceability',
        'energy',
        'instrumentalness',
        'liveness',
        'loudness',
        'speechiness',
        'tempo',
        'valence'
    ];

    function getStoredToken() {
        try {
            return sessionStorage.getItem(STORAGE_KEY);
        } catch (e) {
            return null;
        }
    }

    function setStoredToken(token) {
        try {
            sessionStorage.setItem(STORAGE_KEY, token);
        } catch (e) {}
    }

    function getAuthCodeFromQuery() {
        var params = new URLSearchParams(window.location.search);
        return params.get('code');
    }

    function clearQueryParams() {
        if (window.history.replaceState) {
            window.history.replaceState(null, '', window.location.pathname);
        }
    }

    function getStoredCodeVerifier() {
        try {
            return sessionStorage.getItem(PKCE_VERIFIER_KEY);
        } catch (e) {
            return null;
        }
    }

    function setStoredCodeVerifier(v) {
        try {
            sessionStorage.setItem(PKCE_VERIFIER_KEY, v);
        } catch (e) {}
    }

    function clearStoredCodeVerifier() {
        try {
            sessionStorage.removeItem(PKCE_VERIFIER_KEY);
        } catch (e) {}
    }

    function base64UrlEncode(buffer) {
        var binary = '';
        var bytes = new Uint8Array(buffer);
        for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function generateCodeVerifier() {
        var array = new Uint8Array(32);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(array);
        } else {
            for (var i = 0; i < 32; i++) array[i] = Math.floor(Math.random() * 256);
        }
        return base64UrlEncode(array);
    }

    function sha256(str) {
        return new Promise(function (resolve, reject) {
            var encoder = new TextEncoder();
            var data = encoder.encode(str);
            if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
                crypto.subtle.digest('SHA-256', data).then(resolve).catch(reject);
            } else {
                reject(new Error('PKCE requires crypto.subtle'));
            }
        });
    }

    function buildCodeChallenge(verifier) {
        return sha256(verifier).then(function (hash) {
            return base64UrlEncode(hash);
        });
    }

    function exchangeCodeForToken(code, codeVerifier) {
        var uri = REDIRECT_URI || (window.location.origin + window.location.pathname);
        var body = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: uri,
            client_id: CLIENT_ID,
            code_verifier: codeVerifier
        });
        return fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        }).then(function (res) {
            if (!res.ok) return res.json().then(function (err) {
                throw new Error(err.error_description || err.error || 'Token exchange failed');
            });
            return res.json();
        }).then(function (data) {
            return data.access_token;
        });
    }

    function showConnect() {
        document.getElementById('spotify-connect-wrap').style.display = '';
        document.getElementById('spotify-content').style.display = 'none';
        document.getElementById('spotify-loading').style.display = 'none';
        document.getElementById('spotify-error').style.display = 'none';
    }

    function showLoading() {
        document.getElementById('spotify-connect-wrap').style.display = 'none';
        document.getElementById('spotify-content').style.display = 'none';
        document.getElementById('spotify-loading').style.display = '';
        document.getElementById('spotify-error').style.display = 'none';
    }

    function showError(msg) {
        document.getElementById('spotify-connect-wrap').style.display = 'none';
        document.getElementById('spotify-content').style.display = 'none';
        document.getElementById('spotify-loading').style.display = 'none';
        var wrap = document.getElementById('spotify-error');
        var textEl = document.getElementById('spotify-error-text');
        var str = typeof msg === 'string' ? msg : (msg && (msg.error_description || msg.message || msg.error)) ? String(msg.error_description || msg.message || msg.error) : 'Something went wrong. Try again.';
        if (textEl) textEl.textContent = str;
        if (wrap) wrap.style.display = '';
    }

    function showContent() {
        document.getElementById('spotify-connect-wrap').style.display = 'none';
        document.getElementById('spotify-loading').style.display = 'none';
        document.getElementById('spotify-error').style.display = 'none';
        document.getElementById('spotify-content').style.display = '';
    }

    function apiFetch(url, token) {
        return fetch(url, {
            headers: { 'Authorization': 'Bearer ' + token }
        }).then(function (res) {
            if (!res.ok) {
                return res.text().then(function (text) {
                    var msg = 'Spotify API error: ' + res.status;
                    try {
                        var body = text ? JSON.parse(text) : {};
                        msg = (body.error_description) || (body.error) || msg;
                    } catch (e) {}
                    throw new Error(msg);
                });
            }
            return res.json();
        });
    }

    function getMe(token) {
        return apiFetch('https://api.spotify.com/v1/me', token);
    }

    function getTopArtists(token) {
        return apiFetch('https://api.spotify.com/v1/me/top/artists?limit=5&time_range=short_term', token);
    }

    function getTopTracks(token) {
        return apiFetch('https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=short_term', token);
    }

    function getAudioFeatures(token, ids) {
        if (!ids.length) return Promise.resolve({ audio_features: [] });
        return apiFetch('https://api.spotify.com/v1/audio-features?ids=' + ids.join(','), token);
    }

    function normalizeFeatures(featuresList) {
        var sums = {};
        var count = 0;
        RADAR_LABELS.forEach(function (k) { sums[k] = 0; });

        featuresList.forEach(function (f) {
            if (!f) return;
            count++;
            if (typeof f.acousticness === 'number') sums.acousticness += f.acousticness;
            if (typeof f.danceability === 'number') sums.danceability += f.danceability;
            if (typeof f.energy === 'number') sums.energy += f.energy;
            if (typeof f.instrumentalness === 'number') sums.instrumentalness += f.instrumentalness;
            if (typeof f.liveness === 'number') sums.liveness += f.liveness;
            if (typeof f.loudness === 'number') sums.loudness += Math.max(0, (f.loudness + 60) / 60);
            if (typeof f.speechiness === 'number') sums.speechiness += f.speechiness;
            if (typeof f.tempo === 'number') sums.tempo += Math.min(1, Math.max(0, (f.tempo - 50) / 150));
            if (typeof f.valence === 'number') sums.valence += f.valence;
        });

        var out = {};
        RADAR_LABELS.forEach(function (k) {
            if (k === 'loudness' || k === 'tempo') {
                out[k] = count ? sums[k] / count : 0;
            } else {
                out[k] = count ? sums[k] / count : 0;
            }
        });
        return out;
    }

    function getGenresFromArtists(artists) {
        var count = {};
        (artists || []).forEach(function (a) {
            (a.genres || []).forEach(function (g) {
                var key = String(g).trim();
                if (key) count[key] = (count[key] || 0) + 1;
            });
        });
        return Object.keys(count)
            .map(function (name) { return { name: name, count: count[name] }; })
            .sort(function (a, b) { return b.count - a.count; })
            .slice(0, 15);
    }

    function renderGenres(artists) {
        var container = document.getElementById('spotify-genres');
        var wrap = document.getElementById('spotify-genres-wrap');
        if (!container) return;
        var list = getGenresFromArtists(artists);
        if (!list.length) {
            container.innerHTML = '<p class="spotify-genres-empty">No genre data from top artists.</p>';
            return;
        }
        container.innerHTML = list.map(function (g) {
            var name = (g.name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return '<span class="spotify-genre-tag" title="' + g.count + ' artist(s)">' + name + '</span>';
        }).join('');
    }

    function renderArtists(artists) {
        var container = document.getElementById('spotify-artists');
        if (!container) return;
        container.innerHTML = artists.slice(0, 5).map(function (a) {
            var img = (a.images && a.images[0] && a.images[0].url) ? a.images[0].url : '';
            var url = (a.external_urls && a.external_urls.spotify) ? a.external_urls.spotify : '#';
            var name = (a.name || 'Artist').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return (
                '<a class="spotify-artist spotify-artist-link" href="' + url + '" target="_blank" rel="noopener noreferrer">' +
                (img ? '<img class="spotify-artist-img" src="' + img + '" alt="" loading="lazy">' : '') +
                '<span class="spotify-artist-name">' + name + '</span>' +
                '</a>'
            );
        }).join('');
    }

    function drawRadar(canvasId, values) {
        var canvas = document.getElementById(canvasId);
        if (!canvas || !values) return;
        var ctx = canvas.getContext('2d');
        var w = canvas.width;
        var h = canvas.height;
        var cx = w / 2;
        var cy = h / 2;
        var radius = Math.min(w, h) / 2 - 48;
        var axes = RADAR_LABELS;
        var n = axes.length;
        var step = (2 * Math.PI) / n;
        var labelRadius = radius + 28;

        ctx.clearRect(0, 0, w, h);

        // Grid circles (0.2, 0.4, 0.6, 0.8, 1.0)
        ctx.strokeStyle = 'rgba(196, 144, 176, 0.35)';
        ctx.lineWidth = 1;
        [0.2, 0.4, 0.6, 0.8, 1.0].forEach(function (r) {
            ctx.beginPath();
            for (var i = 0; i <= n; i++) {
                var a = -Math.PI / 2 + i * step;
                var x = cx + radius * r * Math.cos(a);
                var y = cy + radius * r * Math.sin(a);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        });

        // Axes
        ctx.strokeStyle = 'rgba(196, 144, 176, 0.4)';
        ctx.lineWidth = 1;
        for (var j = 0; j < n; j++) {
            var angle = -Math.PI / 2 + j * step;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
            ctx.stroke();
        }

        // Labels
        ctx.fillStyle = '#c490b0';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        axes.forEach(function (label, j) {
            var angle = -Math.PI / 2 + j * step;
            var x = cx + labelRadius * Math.cos(angle);
            var y = cy + labelRadius * Math.sin(angle);
            ctx.fillText(label, x, y);
        });

        // Data polygon
        var pts = [];
        axes.forEach(function (key, j) {
            var v = Math.min(1, Math.max(0, values[key] != null ? values[key] : 0));
            var angle = -Math.PI / 2 + j * step;
            pts.push({
                x: cx + radius * v * Math.cos(angle),
                y: cy + radius * v * Math.sin(angle)
            });
        });
        ctx.fillStyle = 'rgba(29, 185, 84, 0.35)';
        ctx.strokeStyle = 'rgba(29, 185, 84, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        pts.forEach(function (p, i) {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    function runWithToken(token) {
        showLoading();
        // Use only endpoints still available after Feb 2026: GET /me, GET /me/top/{type}
        Promise.all([getMe(token), getTopArtists(token), getTopTracks(token)])
            .then(function (results) {
                var me = results[0];
                var artistsRes = results[1];
                var tracksRes = results[2];
                var panelName = document.getElementById('spotify-panel-name');
                if (panelName && me && me.display_name) panelName.textContent = 'Top artists for ' + me.display_name;
                var artists = (artistsRes.items || []).slice(0, 5);
                var tracks = (tracksRes.items || []);
                var trackIds = tracks.map(function (t) { return t.id; }).filter(Boolean);

                // Audio features endpoint may be restricted after API changes – try but don’t fail the whole flow
                var chunkSize = 100;
                var promises = [];
                for (var i = 0; i < trackIds.length; i += chunkSize) {
                    promises.push(getAudioFeatures(token, trackIds.slice(i, i + chunkSize)));
                }
                return Promise.all(promises)
                    .then(function (featureResponses) {
                        var allFeatures = [];
                        featureResponses.forEach(function (r) {
                            (r.audio_features || []).forEach(function (f) {
                                if (f) allFeatures.push(f);
                            });
                        });
                        return { artists: artists, avgFeatures: normalizeFeatures(allFeatures) };
                    })
                    .catch(function () {
                        return { artists: artists, avgFeatures: null };
                    });
            })
            .then(function (data) {
                renderArtists(data.artists);
                var canvas = document.getElementById('spotify-radar');
                var genresWrap = document.getElementById('spotify-genres-wrap');
                var tasteDesc = document.getElementById('spotify-taste-desc');
                if (data.avgFeatures) {
                    drawRadar('spotify-radar', data.avgFeatures);
                    if (canvas) canvas.style.display = '';
                    if (genresWrap) genresWrap.style.display = 'none';
                    if (tasteDesc) tasteDesc.textContent = 'Averages from your top tracks (energy, danceability, etc.).';
                } else {
                    if (canvas) canvas.style.display = 'none';
                    if (genresWrap) {
                        genresWrap.style.display = '';
                        renderGenres(data.artists);
                    }
                    if (tasteDesc) tasteDesc.textContent = 'Based on genres from your top artists.';
                }
                showContent();
            })
            .catch(function (err) {
                setStoredToken('');
                var raw = (err && typeof err.message === 'string') ? err.message : (err && (err.error_description || err.error)) ? String(err.error_description || err.error) : 'Failed to load Spotify data. Try connecting again.';
                var msg = raw;
                if (typeof msg === 'string' && msg.toLowerCase().indexOf('premium') !== -1) {
                    msg = 'Spotify Premium required. The account you connected doesn’t have Premium. Connect with a Premium account or upgrade at spotify.com.';
                } else if (typeof msg === 'string' && msg.indexOf('403') !== -1) {
                    msg = 'Access denied (403). Make sure the Spotify account you connected is (1) in your app’s User Management (Dashboard → your app → User Management) and (2) has Premium. If you just added Premium, wait a minute and click Try again, then Connect Spotify.';
                }
                showError(msg);
            });
    }

    function connectClick() {
        if (!CLIENT_ID) {
            showError('Spotify Client ID is not set. Add your Client ID in the script config (see my-vibes.html).');
            return;
        }
        var verifier = generateCodeVerifier();
        setStoredCodeVerifier(verifier);
        buildCodeChallenge(verifier).then(function (challenge) {
            var uri = REDIRECT_URI || (window.location.origin + window.location.pathname);
            var params = new URLSearchParams({
                client_id: CLIENT_ID,
                response_type: 'code',
                redirect_uri: uri,
                scope: SCOPES,
                code_challenge_method: 'S256',
                code_challenge: challenge,
                show_dialog: 'true'
            });
            window.location.href = 'https://accounts.spotify.com/authorize?' + params.toString();
        }).catch(function (err) {
            showError(err.message || 'Could not start Spotify login.');
        });
    }

    function clearAndShowConnect() {
        setStoredToken('');
        clearStoredCodeVerifier();
        showConnect();
    }

    function init() {
        var connectBtn = document.getElementById('spotify-connect-btn');
        if (connectBtn) connectBtn.addEventListener('click', connectClick);
        var tryAgainBtn = document.getElementById('spotify-try-again-btn');
        if (tryAgainBtn) tryAgainBtn.addEventListener('click', clearAndShowConnect);

        var code = getAuthCodeFromQuery();
        if (code) {
            var verifier = getStoredCodeVerifier();
            clearQueryParams();
            clearStoredCodeVerifier();
            if (!verifier) {
                showError('Session expired. Please click Connect Spotify again.');
                return;
            }
            showLoading();
            exchangeCodeForToken(code, verifier).then(function (token) {
                setStoredToken(token);
                runWithToken(token);
            }).catch(function (err) {
                showError(err.message || 'Failed to connect. Try again.');
            });
            return;
        }

        var stored = getStoredToken();
        if (stored) {
            runWithToken(stored);
            return;
        }

        showConnect();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
