(function () {
    var API_BASE = 'https://api.football-data.org/v4';
    var PL_STANDINGS = API_BASE + '/competitions/PL/standings';

    function getApiKey() {
        var k = window.FOOTBALL_DATA_API_KEY;
        return (k != null && k !== '') ? String(k).trim() : '';
    }

    function getProxyUrl() {
        var u = window.EPL_PROXY_URL;
        return (u != null && u !== '') ? String(u).trim() : '';
    }

    function getStaticJsonPath() {
        var p = window.EPL_STANDINGS_JSON;
        return (p != null && p !== '') ? String(p).trim() : '';
    }

    function showLoading() {
        var loading = document.getElementById('epl-loading');
        var error = document.getElementById('epl-error');
        var standings = document.getElementById('epl-standings');
        if (loading) loading.style.display = '';
        if (error) error.style.display = 'none';
        if (standings) standings.style.display = 'none';
    }

    function showError(msg) {
        var loading = document.getElementById('epl-loading');
        var error = document.getElementById('epl-error');
        var standings = document.getElementById('epl-standings');
        if (loading) loading.style.display = 'none';
        if (error) {
            error.textContent = msg;
            error.style.display = '';
        }
        if (standings) standings.style.display = 'none';
    }

    function showTable() {
        var loading = document.getElementById('epl-loading');
        var error = document.getElementById('epl-error');
        var standings = document.getElementById('epl-standings');
        if (loading) loading.style.display = 'none';
        if (error) error.style.display = 'none';
        if (standings) standings.style.display = '';
    }

    function rankBarClass(position) {
        if (position <= 4) return 'champions-league';
        if (position === 5) return 'europa';
        if (position === 6) return 'conference';
        if (position >= 18) return 'relegation';
        return '';
    }

    function renderForm(formStr) {
        if (!formStr || typeof formStr !== 'string') return '';
        var last5 = formStr.slice(-5).toUpperCase();
        var html = '';
        for (var i = 0; i < last5.length; i++) {
            var c = last5[i];
            var cls = c === 'W' ? 'win' : c === 'D' ? 'draw' : 'loss';
            var letter = c === 'W' ? 'W' : c === 'D' ? 'D' : 'L';
            html += '<span class="epl-form-dot ' + cls + '" title="' + letter + '">' + letter + '</span>';
        }
        return '<div class="epl-form">' + html + '</div>';
    }

    function renderRow(row, index) {
        var pos = row.position;
        var team = row.team || {};
        var crest = team.crest || '';
        var name = team.shortName || team.name || '—';
        var barClass = rankBarClass(pos);
        var bar = barClass ? '<span class="epl-rank-bar ' + barClass + '"></span>' : '';
        var crestImg = crest ? '<img class="epl-crest" src="' + crest + '" alt="" loading="lazy">' : '';
        var formHtml = renderForm(row.form || '');

        return (
            '<tr>' +
            '<td class="epl-col-club">' +
            '<div class="epl-club">' +
            '<div class="epl-rank-wrap">' + bar + '<span>' + pos + '</span></div>' +
            crestImg +
            '<span class="epl-club-name">' + escapeHtml(name) + '</span>' +
            '</div></td>' +
            '<td class="epl-col-num">' + (row.playedGames ?? '—') + '</td>' +
            '<td class="epl-col-num">' + (row.won ?? '—') + '</td>' +
            '<td class="epl-col-num">' + (row.draw ?? '—') + '</td>' +
            '<td class="epl-col-num">' + (row.lost ?? '—') + '</td>' +
            '<td class="epl-col-num">' + (row.goalsFor ?? '—') + '</td>' +
            '<td class="epl-col-num">' + (row.goalsAgainst ?? '—') + '</td>' +
            '<td class="epl-col-num">' + (row.goalDifference ?? '—') + '</td>' +
            '<td class="epl-col-pts">' + (row.points ?? '—') + '</td>' +
            '<td class="epl-col-form">' + formHtml + '</td>' +
            '</tr>'
        );
    }

    function escapeHtml(s) {
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    function run() {
        var tbody = document.getElementById('epl-table-body');
        if (!tbody) return;

        var staticPath = getStaticJsonPath();
        var proxyUrl = getProxyUrl();
        var key = getApiKey();
        if (!staticPath && !proxyUrl && !key) {
            showError('Set EPL_STANDINGS_JSON (e.g. data/epl-standings.json) or add FOOTBALL_DATA_API_KEY and run the GitHub Action once.');
            return;
        }

        showLoading();

        var fetchUrl = staticPath || proxyUrl || PL_STANDINGS;
        var fetchOpts = { method: 'GET' };
        if (!staticPath && !proxyUrl && key) fetchOpts.headers = { 'X-Auth-Token': key };

        fetch(fetchUrl, fetchOpts)
            .then(function (res) {
                if (!res.ok) {
                    if (res.status === 404 && staticPath) return Promise.reject(new Error('Standings file not ready yet. Run the "Update EPL standings" workflow once (Actions tab), or wait for the next scheduled update.'));
                    if (res.status === 401) return Promise.reject(new Error('Invalid API key'));
                    if (res.status === 429) return Promise.reject(new Error('Too many requests; try again later'));
                    return res.json().then(function (data) { throw new Error(data.message || 'Request failed'); }).catch(function (e) {
                        if (e.message) throw e;
                        throw new Error('Request failed: ' + res.status);
                    });
                }
                return res.json();
            })
            .then(function (data) {
                var table = (data.standings && data.standings[0] && data.standings[0].table) ? data.standings[0].table : [];
                tbody.innerHTML = table.map(renderRow).join('');
                showTable();
            })
            .catch(function (err) {
                var msg = err.message || 'Could not load standings.';
                if (msg === 'Failed to fetch' || err.name === 'TypeError') {
                    msg = 'Request blocked. Use EPL_STANDINGS_JSON (GitHub-only) or a proxy.';
                }
                showError(msg);
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
