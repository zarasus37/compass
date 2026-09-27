/* ============================================================
 *  Compass · Landing Page · Interactivity
 *  Small, focused. No framework. Plain ES modules.
 * ============================================================ */

(function () {
  'use strict';

  /* -------- Almanac is now static HTML (per spec).
     Build-time helper removed. ---------------------- */

  /* -------- Net-worth ticker (auto-scrolls) -------- */
  function buildTicker() {
    const track = document.getElementById('ticker-track');
    if (!track) return;

    // Mock movement of holdings/positions
    const items = [
      ['cash', 'savings', '+0.18', 'up'],
      ['VTI', 'broad mkt', '+1.24', 'up'],
      ['NVDA', 'chip', '-0.42', 'down'],
      ['TSLA', 'auto', '+2.18', 'up'],
      ['SPAXX', 'mm sweep', '+0.01', 'flat'],
      ['BTC', 'crypto', '+3.84', 'up'],
      ['ETH', 'crypto', '+1.92', 'up'],
      ['BND', 'bonds', '-0.08', 'down'],
      ['AAPL', 'tech', '+0.62', 'up'],
      ['VOO', 'broad mkt', '+0.94', 'up'],
      ['GLD', 'gold etf', '+0.34', 'up'],
      ['emergency', 'fund', 'target', 'flat'],
    ];

    const makeSpan = (label, name, delta, dir) => {
      const s = document.createElement('span');
      s.innerHTML = `${label} <strong style="color:var(--text-dim)">${name}</strong> <span class="${dir}">${delta}%</span>`;
      return s;
    };

    // duplicate for seamless loop
    items.forEach((it) => track.appendChild(makeSpan(...it)));
    items.forEach((it) => track.appendChild(makeSpan(...it)));
  }

  /* -------- Live clock in dashboard chrome -------- */
  function startClock() {
    const el = document.getElementById('dash-time');
    if (!el) return;

    const tick = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      el.textContent = `${hh}:${mm}:${ss}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  /* -------- Build hash (mock, static for the landing page) -------- */
  function stampBuild() {
    const el = document.getElementById('build-hash');
    if (!el) return;
    // Lightweight pseudo-hash from the document's current date + page load
    const seed = Date.now().toString(36).slice(-6).toUpperCase();
    el.textContent = seed;
  }

  /* -------- Waitlist form (client-side validation only) -------- */
  function bindWaitlist() {
    const form = document.getElementById('waitlist');
    if (!form) return;
    const input = form.querySelector('input[type="email"]');
    const feedback = document.getElementById('form-feedback');
    if (!input || !feedback) return;

    const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (!isValidEmail(v)) {
        feedback.textContent = '[WARN]  please use a valid email address';
        feedback.classList.add('is-warn');
        input.focus();
        return;
      }
      feedback.classList.remove('is-warn');
      feedback.textContent = `[OK]   ${v} · [INDEXED] you'll hear from us when the next cohort opens.`;
      form.querySelector('button').textContent = 'INDEXED ✓';
      form.querySelector('button').disabled = true;
      input.disabled = true;
    });

    input.addEventListener('input', () => {
      if (feedback.classList.contains('is-warn')) {
        feedback.textContent = '';
        feedback.classList.remove('is-warn');
      }
    });
  }

  /* -------- Hoverable sparkline (crosshair + tooltip) -------- */
  function bindSparkline() {
    const spark = document.getElementById('spark');
    if (!spark) return;

    const dot = spark.querySelector('#spark-dot');
    const cross = spark.querySelector('#spark-cross');
    const tip = spark.querySelector('#spark-tip');
    const tipDay = spark.querySelector('.spark__tip-day');
    const tipVal = spark.querySelector('.spark__tip-val');
    const svg = spark.querySelector('svg');
    if (!dot || !cross || !tip || !svg) return;

    // Y values from the path — match the static chart we drew
    const ysAttr = spark.getAttribute('data-points') || '';
    const ys = ysAttr.split(',').map((n) => parseFloat(n.trim()));
    if (ys.length === 0) return;

    // Sample 13 days of safe-to-spend values to render in tooltip
    // Start at $1,820 and grow toward $1,847.42 with the spark's shape
    const sampleValues = [
      1820, 1830, 1810, 1855, 1842, 1868, 1880, 1872, 1901, 1895,
      1925, 1912, 1847,
    ];
    const todayVal = 1847.42;
    sampleValues[sampleValues.length - 1] = todayVal;

    // SVG viewBox is 0 0 300 60
    const VB_W = 300;
    const VB_H = 60;
    // X positions where the path data points sit
    const xPositions = ys.map((_, i) => (i / (ys.length - 1)) * VB_W);

    const setActive = (visible, idx, xPx, yPx) => {
      if (!visible) {
        dot.setAttribute('opacity', '0');
        cross.setAttribute('opacity', '0');
        tip.classList.remove('is-active');
        return;
      }
      const clampedIdx = Math.max(0, Math.min(ys.length - 1, idx));
      const x = xPositions[clampedIdx];
      const y = ys[clampedIdx];
      dot.setAttribute('cx', x.toFixed(2));
      dot.setAttribute('cy', y.toFixed(2));
      dot.setAttribute('opacity', '1');
      cross.setAttribute('x1', x.toFixed(2));
      cross.setAttribute('x2', x.toFixed(2));
      cross.setAttribute('opacity', '1');

      const dayLabel = clampedIdx === ys.length - 1 ? 'today' : `day ${clampedIdx + 1}`;
      tipDay.textContent = dayLabel;
      tipVal.textContent = `$${sampleValues[clampedIdx].toLocaleString(undefined, {
        minimumFractionDigits: clampedIdx === ys.length - 1 ? 2 : 0,
        maximumFractionDigits: 2,
      })}`;

      // Position tooltip in CSS pixels
      const rect = svg.getBoundingClientRect();
      const scale = rect.width / VB_W;
      const px = x * scale;
      const py = y * (rect.height / VB_H);
      tip.style.left = `${px}px`;
      tip.style.top = `${py}px`;
      tip.classList.add('is-active');
    };

    const onMove = (e) => {
      const rect = svg.getBoundingClientRect();
      const xCss = e.clientX - rect.left;
      const xVb = (xCss / rect.width) * VB_W;
      // Find closest point by x
      let bestIdx = 0;
      let bestDist = Infinity;
      xPositions.forEach((x, i) => {
        const d = Math.abs(x - xVb);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      });
      setActive(true, bestIdx);
    };

    const onLeave = () => setActive(false);

    svg.addEventListener('mousemove', onMove);
    svg.addEventListener('mouseleave', onLeave);
    // Touch support: tap to lock, tap outside to clear
    svg.addEventListener(
      'touchstart',
      (e) => {
        const t = e.touches[0];
        if (!t) return;
        onMove({ clientX: t.clientX, clientY: t.clientY });
      },
      { passive: true }
    );
    svg.addEventListener('touchend', onLeave, { passive: true });
  }

  /* -------- Donut chart: animate on load + hover ↔ legend -------- */
  function bindDonut() {
    const segs = Array.from(document.querySelectorAll('.donut__seg'));
    const legendItems = Array.from(document.querySelectorAll('.donut__legend li'));
    const donut = document.querySelector('.donut');
    if (!segs.length || !donut) return;

    // Animate segments on load: stroke-dasharray → full length over 0.9s
    segs.forEach((seg, idx) => {
      const len = parseFloat(seg.style.getPropertyValue('--seg-len')) || 0;
      // Start fully hidden: dasharray 0
      seg.style.strokeDasharray = `0 999`;
      seg.style.transition = `stroke-dasharray 0.9s cubic-bezier(.4,.0,.2,1) ${0.18 * idx}s`;
      // Force a reflow so the transition triggers
      // eslint-disable-next-line no-unused-expressions
      seg.getBoundingClientRect();
      // Now animate to real length
      seg.style.strokeDasharray = `${len.toFixed(2)} 999`;
      // Preserve the inline offset (which positions the segment around the ring)
      const offsetAttr = seg.getAttribute('stroke-dashoffset') || '0';
      seg.style.strokeDashoffset = offsetAttr;
    });

    const setActive = (idx) => {
      donut.classList.add('has-hover');
      segs.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      legendItems.forEach((li, i) => li.classList.toggle('is-active', i === idx));
    };
    const clearActive = () => {
      donut.classList.remove('has-hover');
      segs.forEach((s) => s.classList.remove('is-active'));
      legendItems.forEach((li) => li.classList.remove('is-active'));
    };

    segs.forEach((seg, idx) => {
      seg.addEventListener('mouseenter', () => setActive(idx));
      seg.addEventListener('mouseleave', () => {
        // small delay so legend can pick up
        clearTimeout(seg._leaveTimer);
        seg._leaveTimer = setTimeout(clearActive, 60);
      });
    });
    legendItems.forEach((li, idx) => {
      li.addEventListener('mouseenter', () => setActive(idx));
      li.addEventListener('mouseleave', () => {
        clearTimeout(li._leaveTimer);
        li._leaveTimer = setTimeout(clearActive, 60);
      });
    });
  }

  /* -------- Init on DOM ready -------- */
  function init() {
    buildTicker();
    startClock();
    stampBuild();
    bindWaitlist();
    bindSparkline();
    bindDonut();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
