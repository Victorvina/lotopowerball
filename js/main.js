// ===== TODAY'S DATE =====
(function setToday() {
  var el = document.getElementById('today');
  if (!el) return;
  var d = new Date();
  var opts = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  el.textContent = d.toLocaleDateString('en-US', opts);
})();

// ===== COUNTDOWN TO NEXT DRAW =====
function nextDrawET() {
  // Powerball draws: Mon (1), Wed (3), Sat (6) at 10:59 PM ET
  // ET = UTC-5 (standard) or UTC-4 (DST). We approximate with UTC-4 for June.
  var now = new Date();
  var nowUTC = now.getTime();
  var ET_OFFSET_MS = -4 * 60 * 60 * 1000;
  var nowET = new Date(nowUTC + ET_OFFSET_MS);
  var drawDays = [1, 3, 6];

  for (var i = 0; i < 8; i++) {
    var candidate = new Date(nowET.getTime() + i * 86400000);
    candidate.setUTCHours(22, 59, 0, 0);
    if (drawDays.indexOf(candidate.getUTCDay()) >= 0 && candidate.getTime() > nowET.getTime()) {
      return new Date(candidate.getTime() - ET_OFFSET_MS);
    }
  }
  return new Date(nowUTC + 86400000);
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function tick() {
  var target = nextDrawET();
  var diff = Math.max(0, target.getTime() - Date.now());
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

// ===== AFFILIATE CLICK TRACKING =====
function trackClick(e) {
  var el = e.currentTarget;
  var partner = el.getAttribute('data-aff');
  var location = el.getAttribute('data-loc') || 'unknown';
  if (typeof gtag !== 'undefined') {
    gtag('event', 'affiliate_click', {
      event_category: 'affiliate',
      event_label: partner,
      placement: location
    });
  }
  if (window.dataLayer) {
    window.dataLayer.push({ event: 'affiliate_click', partner: partner, location: location });
  }
}
document.querySelectorAll('[data-aff]').forEach(function(el) {
  el.addEventListener('click', trackClick);
});

// ===== SCROLL-TRIGGERED ANIMATIONS =====
if ('IntersectionObserver' in window) {
  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.aff-card, .result-feature, .table-wrap, .faq-item').forEach(function(el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    io.observe(el);
  });
}
