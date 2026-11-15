/* ============================================================
   Site import — разбор страницы команды ПГФВ
   ============================================================ */
(function (root) {
  'use strict';

  var PHOTO_PROXY = 'https://wsrv.nl/?url=';

  function localProxyBase() {
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return '';
    var host = location.hostname;
    if (host === '127.0.0.1' || host === 'localhost') return '/api/proxy?url=';
    return '';
  }

  var API_BASE = 'https://perm-volley.ru/wp-json/wp/v2/';

  function apiEndpoint(url) {
    return localProxyBase() ? localProxyBase() + encodeURIComponent(url) : url;
  }

  async function fetchJson(url) {
    var response = await fetch(apiEndpoint(url), {
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  }

  function extractPostId(html) {
    var match = /postid-(\d+)/.exec(String(html || ''));
    return match ? match[1] : '';
  }

  function slugFromUrl(url) {
    try {
      var parts = new URL(url).pathname.split('/').filter(Boolean);
      return parts.length ? parts[parts.length - 1] : '';
    } catch (err) {
      return '';
    }
  }

  async function resolveTeamLogo(pageUrl, postId) {
    try {
      var team = null;
      if (postId) {
        team = await fetchJson(API_BASE + 'teams/' + encodeURIComponent(postId) + '?_fields=id,featured_media');
      } else {
        var slug = slugFromUrl(pageUrl);
        if (!slug) return '';
        var teams = await fetchJson(API_BASE + 'teams?slug=' + encodeURIComponent(slug) + '&_fields=id,featured_media');
        team = Array.isArray(teams) ? teams[0] : teams;
      }
      if (!team || !team.featured_media) return '';
      var media = await fetchJson(API_BASE + 'media/' + encodeURIComponent(team.featured_media) + '?_fields=source_url');
      return media && media.source_url ? media.source_url : '';
    } catch (err) {
      return '';
    }
  }

  function text(node) {
    return node ? node.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function resolveUrl(src, baseUrl) {
    if (!src) return '';
    try {
      return new URL(src, baseUrl || 'https://perm-volley.ru/').href;
    } catch (err) {
      return src;
    }
  }

  function fullPhotoUrl(url) {
    return url.replace(/-\d+x\d+(\.(?:jpe?g|png|webp))$/i, '$1');
  }

  function pickPhoto(card) {
    var img = card.querySelector('.playerCard__img img') || card.querySelector('img');
    if (!img) return { url: '', fallback: '' };
    var src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
    if (!src) {
      var srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset') || '';
      src = srcset.split(',')[0].trim().split(/\s+/)[0] || '';
    }
    return { url: fullPhotoUrl(src), fallback: src };
  }

  function dedupe(players) {
    var seen = Object.create(null);
    return players.filter(function (p) {
      var key = p.name.toLowerCase() + '|' + p.birth;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function parseTeamHtml(html, baseUrl) {
    var doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    var h1 = doc.querySelector('h1');
    var teamName = text(h1).replace(/\s*[—–-]\s*ПГФВ\s*$/i, '');
    var players = [];

    Array.prototype.forEach.call(doc.querySelectorAll('.playerCard__item'), function (card) {
      var name = text(card.querySelector('.playerCard__name'));
      if (!name) return;
      var birth = text(card.querySelector('.playerCard__bday'));
      if (!/^\d{2}\.\d{2}\.\d{4}$/.test(birth)) birth = '';
      var photo = pickPhoto(card);
      players.push({
        name: name,
        birth: birth,
        photoUrl: resolveUrl(photo.url, baseUrl),
        photoFallback: resolveUrl(photo.fallback, baseUrl),
        number: '',
        position: ''
      });
    });

    if (!players.length) {
      Array.prototype.forEach.call(doc.querySelectorAll('table tr'), function (row) {
        var img = row.querySelector('img');
        var link = row.querySelector('a[href*="/teams/"]');
        var name = text(link);
        var birth = '';
        var cells = row.querySelectorAll('td');
        Array.prototype.forEach.call(cells, function (cell) {
          var value = text(cell);
          if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) birth = value;
        });
        if (!name || !birth) return;
        var src = img ? (img.getAttribute('src') || img.getAttribute('data-src') || '') : '';
        players.push({
          name: name,
          birth: birth,
          photoUrl: resolveUrl(fullPhotoUrl(src), baseUrl),
          photoFallback: resolveUrl(src, baseUrl),
          number: '',
          position: ''
        });
      });
    }

    return {
      teamName: teamName,
      players: dedupe(players),
      sourceUrl: baseUrl || '',
      postId: extractPostId(html)
    };
  }

  async function fetchPage(url) {
    var endpoint = localProxyBase()
      ? localProxyBase() + encodeURIComponent(url)
      : url;
    var response = await fetch(endpoint, { mode: 'cors', credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    var text = await response.text();
    var type = response.headers.get('content-type') || '';
    if (type.indexOf('json') !== -1) {
      try {
        var data = JSON.parse(text);
        if (data && Array.isArray(data.players)) {
          return {
            teamName: data.teamName || data.name || '',
            players: data.players
          };
        }
      } catch (err) { /* not JSON */ }
    }
    var parsed = parseTeamHtml(text, url);
    if (parsed.players.length) {
      parsed.logoUrl = await resolveTeamLogo(url, parsed.postId);
    }
    return parsed;
  }

  async function fetchPhotoBlob(url, fallbackUrl, useProxy) {
    var candidates = [url];
    if (fallbackUrl && fallbackUrl !== url) candidates.push(fallbackUrl);
    var lastError = null;

    for (var i = 0; i < candidates.length; i++) {
      try {
        var response = await fetch(candidates[i], { mode: 'cors', credentials: 'omit', cache: 'force-cache' });
        if (response.ok) return await response.blob();
        lastError = new Error('HTTP ' + response.status);
      } catch (err) {
        lastError = err;
      }
    }

    // На локальном сервере страница и фото идут через /api/proxy.
    if (localProxyBase()) {
      for (var j = 0; j < candidates.length; j++) {
        try {
          var proxyResponse = await fetch(localProxyBase() + encodeURIComponent(candidates[j]), {
            mode: 'cors', credentials: 'omit', cache: 'force-cache'
          });
          if (proxyResponse.ok) return await proxyResponse.blob();
          lastError = new Error('HTTP ' + proxyResponse.status);
        } catch (err) {
          lastError = err;
        }
      }
    }

    if (useProxy) {
      try {
        var proxied = PHOTO_PROXY + encodeURIComponent(candidates[0]) +
          '&w=600&h=800&fit=cover&output=jpg&q=85&il';
        var pr = await fetch(proxied, { mode: 'cors', credentials: 'omit', cache: 'force-cache' });
        if (pr.ok) return await pr.blob();
        lastError = new Error('HTTP ' + pr.status);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('photo');
  }

  root.SiteImport = {
    parseTeamHtml: parseTeamHtml,
    fetchPage: fetchPage,
    fetchPhotoBlob: fetchPhotoBlob,
    resolveTeamLogo: resolveTeamLogo,
    fullPhotoUrl: fullPhotoUrl
  };
})(window);
