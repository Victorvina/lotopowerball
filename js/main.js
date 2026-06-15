/* =====================================================
 * LotoPowerball — main.js
 * Countdown, click tracking, scroll FX, and live API data.
 * ===================================================== */

// =====================================================
// CONFIG — Worker API endpoint
// =====================================================
// After deploying the Worker, choose ONE of these:
//
//   A) Worker on workers.dev subdomain (default after `wrangler deploy`):
//      const API_BASE = 'https://lotopowerball-api.YOUR-SUBDOMAIN.workers.dev';
//
//   B) Worker bound to a route on your domain (recommended for prod):
//      const API_BASE = ''; // empty = use same origin, e.g. /api/all
//
// To set up B (route binding):
//   Cloudflare Dashboard → Workers & Pages → lotopowerball-api
//   → Settings → Domains & Routes → Add → Route
//   → lotopowerball.com/api/*
//
const API_BASE = ''; // change to your workers.dev URL until route is set up

const CACHE_KEY = 'lpb_api_cache_v1';
const CACHE_TTL = 5 * 60 * 1000; // 5 min in ms

// =====================================================
// TODAY'S DATE in top bar
// =====================================================
(function setToday() {
  var el = document.getElementById('today');
  if (!el) return;
  var d = new Date();
  el.textContent = d.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
})();

// =====================================================
// COUNTDOWN to next draw (Mon/Wed/Sat 22:59 ET)
// =====================================================
function nextDrawET() {
  var now    = new Date();
  var ET_MS  = -4 * 60 * 60 * 1000; // EDT (UTC-4) — June is DST
  var nowET  = new Date(now.getTime() + ET_MS);
  var drawDays = [1, 3, 6]; // Mon, Wed, Sat

  for (var i = 0; i < 8; i++) {
    var c = new Date(nowET.getTime() + i * 86400000);
    c.setUTCHours(22, 59, 0, 0);
    if (drawDays.indexOf(c.getUTCDay()) >= 0 && c.getTime() > nowET.getTime()) {
      return new Date(c.getTime() - ET_MS);
    }
  }
  return new Date(now.getTime() + 86400000);
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function tick() {
  var target = nextDrawET();
  var diff   = Math.max(0, target.getTime() - Date.now());
  var d = Math.floor(diff / 86400000);
  var h = Math.floor((diff % 86400000) / 3600000);
  var m = Math.floor((diff % 3600000) / 60000);
  var s = Math.floor((diff % 60000) / 1000);
  var $d = document.getElementById('cd-d');
  var $h = document.getElementById('cd-h');
  var $m = document.getElementById('cd-m');
  var $s = document.getElementById('cd-s');
  if ($d) $d.textContent = pad(d);
  if ($h) $h.textContent = pad(h);
  if ($m) $m.textContent = pad(m);
  if ($s) $s.textContent = pad(s);
}
tick();
setInterval(tick, 1000);

// =====================================================
// AFFILIATE CLICK TRACKING
// =====================================================
document.querySelectorAll('[data-aff]').forEach(function (el) {
  el.addEventListener('click', function (e) {
    var partner  = e.currentTarget.getAttribute('data-aff');
    var location = e.currentTarget.getAttribute('data-loc') || 'unknown';
    if (typeof gtag !== 'undefined') {
      gtag('event', 'affiliate_click', {
        event_category: 'affiliate',
        event_label:    partner,
        placement:      location,
      });
    }
    if (window.dataLayer) {
      window.dataLayer.push({
        event:    'affiliate_click',
        partner:  partner,
        location: location,
      });
    }
  });
});

// =====================================================
// SCROLL-TRIGGERED ANIMATIONS
// =====================================================
if ('IntersectionObserver' in window) {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity   = '1';
        entry.target.style.transform = 'translateY(0)';
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll(
    '.aff-card, .result-feature, .table-wrap, .faq-item'
  ).forEach(function (el) {
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    io.observe(el);
  });
}

// =====================================================
// LIVE DATA — fetch from Worker API
// =====================================================

function readCache() {
  try {
    var raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed.data;
  } catch (_) {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data }));
  } catch (_) { /* quota or private mode */ }
}

async function fetchLiveData() {
  var cached = readCache();
  if (cached) return cached;

  try {
    var res = await fetch(API_BASE + '/api/all', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    var data = await res.json();
    if (!data || !data.latest) return null;
    writeCache(data);
    return data;
  } catch (_) {
    return null;
  }
}

function renderLatest(latest) {
  if (!latest) return;

  var dateEl = document.querySelector('.result-feature .result-date');
  if (dateEl && latest.date_display) dateEl.textContent = latest.date_display;

  var ballSet = document.querySelector('.result-feature .ball-set');
  if (ballSet && Array.isArray(latest.numbers) && latest.numbers.length === 5) {
    // Find the 5 white balls (those NOT having .ball-pb class)
    var whiteBalls = ballSet.querySelectorAll('.ball:not(.ball-pb)');
    for (var i = 0; i < 5 && i < whiteBalls.length; i++) {
      whiteBalls[i].textContent = latest.numbers[i];
    }
    var pb = ballSet.querySelector('.ball-pb');
    if (pb && latest.powerball) pb.textContent = latest.powerball;
  }

  var ppEl = document.querySelector('.result-feature .powerplay strong');
  if (ppEl && latest.multiplier) ppEl.textContent = latest.multiplier + 'x';
}

function renderHistory(history) {
  if (!Array.isArray(history) || history.length === 0) return;
  var tbody = document.querySelector('.section-history .data-table tbody');
  if (!tbody) return;

  var dayShort = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var monthShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function shortDate(iso) {
    var d = new Date(iso + 'T12:00:00Z');
    return monthShort[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
  }
  function dayLabel(iso) {
    var d = new Date(iso + 'T12:00:00Z');
    return dayShort[d.getUTCDay()];
  }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  var rows = history.slice(0, 7).map(function (row, idx) {
    var nums = row.numbers.map(pad2).join(' &middot; ');
    var pb   = pad2(row.powerball);
    var pp   = row.multiplier ? row.multiplier + 'x' : '—';
    var jackpot = '—';
    var winner  = idx === 0
      ? '<span class="t-rolled">Latest</span>'
      : '<span class="t-rolled">Rolled over</span>';
    return (
      '<tr>' +
        '<td class="t-date">' + shortDate(row.date) + ' <span class="day">' + dayLabel(row.date) + '</span></td>' +
        '<td class="t-nums">' + nums + '</td>' +
        '<td class="t-pb">' + pb + '</td>' +
        '<td>' + pp + '</td>' +
        '<td class="num">' + jackpot + '</td>' +
        '<td>' + winner + '</td>' +
      '</tr>'
    );
  });

  tbody.innerHTML = rows.join('');
}

async function refreshLiveData() {
  var data = await fetchLiveData();
  if (!data) return;
  renderLatest(data.latest);
  renderHistory(data.history);
}

refreshLiveData();
setInterval(refreshLiveData, 60 * 1000);
