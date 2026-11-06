/* Rahasya paper shell: the thread, reveals, parallax, reading line. Figures live in js/segments.js.
   Helpers for figures are on IKS.paper: inView(node, fn), roll(node, to, fmt), rm(). */
(function () {
  'use strict';
  var IKS = window.IKS, doc = document, root = doc.documentElement;
  root.classList.add('js');
  function rm() { return !!IKS.reducedMotion; }

  /* ---- run fn once when node enters view */
  function inView(node, fn, opts) {
    if (!node) return;
    if (rm() || !('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { io.disconnect(); fn(); }
    }, opts || { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    io.observe(node);
  }
  /* ---- roll a number; fmt(n) gives the text */
  function roll(node, to, fmt) {
    fmt = fmt || function (n) { return Math.round(n).toLocaleString('en-IN'); };
    var from = node._v || 0; node._v = to;
    if (rm()) { node.textContent = fmt(to); return; }
    var t0 = performance.now(), dur = 900;
    (function step(t) {
      if (node._v !== to) return;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      node.textContent = fmt(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  IKS.paper = { inView: inView, roll: roll, rm: rm };

  /* ---- title folio art */
  /* the dawn scene and all depth layers are built in js/scene.js */

  /* ---- split takeaways into masked words (keeps <em>) */
  Array.prototype.forEach.call(doc.querySelectorAll('.take[data-split]'), function (t) {
    if (rm()) return;
    var i = 0;
    (function walk(host) {
      Array.prototype.slice.call(host.childNodes).forEach(function (n) {
        if (n.nodeType === 1) { walk(n); return; }
        if (n.nodeType !== 3 || !n.nodeValue.trim()) return;
        var f = doc.createDocumentFragment();
        n.nodeValue.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { f.appendChild(doc.createTextNode(' ')); return; }
          var o = doc.createElement('span'), s = doc.createElement('span');
          o.className = 'w'; s.textContent = w; s.style.setProperty('--i', i++);
          o.appendChild(s); f.appendChild(o);
        });
        host.replaceChild(f, n);
      });
    })(t);
  });

  /* ---- reveals */
  Array.prototype.forEach.call(doc.querySelectorAll('.take[data-split], .folio'), function (n) {
    inView(n, function () { n.classList.add('is-in'); }, { threshold: 0.2 });
  });
  Array.prototype.forEach.call(doc.querySelectorAll('.say, .leaf, .full, .verify, [data-up]'), function (n) {
    n.classList.add('up');
    inView(n, function () { n.classList.add('is-in'); }, { threshold: 0.06 });
  });
  if (rm()) Array.prototype.forEach.call(doc.querySelectorAll('.up, .take, .folio'), function (n) { n.classList.add('is-in'); });

  /* ---- the thread: one continuous line through a string hole in every folio */
  var main = doc.getElementById('main'), svg = doc.getElementById('sutra');
  var NS = 'http://www.w3.org/2000/svg', table = [], holes = [], live, len = 0, top = 0;
  function mk(tag, attrs, parent) { var e = doc.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; }
  function layout() {
    var w = parseFloat(getComputedStyle(svg).width) || 60, H = main.scrollHeight, mx = w * 0.5, amp = w * 0.26;
    top = main.getBoundingClientRect().top + window.pageYOffset;
    svg.setAttribute('width', w); svg.setAttribute('height', H); svg.setAttribute('viewBox', '0 0 ' + w + ' ' + H);
    svg.style.height = H + 'px';
    var pts = Array.prototype.map.call(main.querySelectorAll('.seg'), function (s) {
      var head = s.querySelector('.folio') || s;
      return head.getBoundingClientRect().top + window.pageYOffset - top + 18;
    });
    var d = 'M' + mx + ' 0', prev = 0;
    pts.concat([H]).forEach(function (y, i) {
      var side = i % 2 ? 1 : -1, c = (y - prev) * 0.42;
      d += ' C' + (mx + side * amp) + ' ' + (prev + c) + ' ' + (mx + side * amp) + ' ' + (y - c) + ' ' + mx + ' ' + y;
      prev = y;
    });
    svg.textContent = '';
    mk('path', { class: 's-shade', d: d }, svg);
    mk('path', { class: 's-base', d: d }, svg);
    live = mk('path', { class: 's-live', d: d }, svg);
    len = live.getTotalLength();
    live.style.strokeDasharray = len + ' ' + len;
    holes = pts.map(function (y) { return { y: y, n: mk('circle', { class: 'hole', cx: mx, cy: y, r: Math.max(5, w * 0.075) }, svg) }; });
    table = [];
    for (var k = 0, N = 240; k <= N; k++) { var L = len * k / N; table.push([live.getPointAtLength(L).y, L]); }
    tick();
  }
  function lengthAt(y) {
    var a = 0, b = table.length - 1;
    while (b - a > 1) { var m = (a + b) >> 1; if (table[m][0] < y) a = m; else b = m; }
    var p = table[a], q = table[b], f = q[0] > p[0] ? (y - p[0]) / (q[0] - p[0]) : 0;
    return p[1] + (q[1] - p[1]) * Math.max(0, Math.min(1, f));
  }

  /* ---- scroll: thread, reading line, parallax */
  var bar = doc.getElementById('read-line'), texts = doc.querySelectorAll('.seg-tex'), ticking = false;
  function tick() {
    ticking = false;
    var sy = window.pageYOffset, vh = window.innerHeight, y = sy + vh * 0.62 - top;
    if (live) {
      live.style.strokeDashoffset = rm() ? 0 : len - lengthAt(y);
      holes.forEach(function (h) { h.n.classList.toggle('is-on', rm() || h.y < y); });
    }
    var max = root.scrollHeight - vh;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? sy / max : 0) + ')';
    if (!rm()) Array.prototype.forEach.call(texts, function (t) {
      var r = t.parentNode.getBoundingClientRect();
      if (r.bottom > -100 && r.top < vh + 100) t.style.transform = 'translate3d(0,' + Math.round((r.top + r.height / 2 - vh / 2) * -0.07) + 'px,0)';
    });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  var rT; function onLayout() { clearTimeout(rT); rT = setTimeout(layout, 120); }
  window.addEventListener('resize', onLayout);
  if ('ResizeObserver' in window) new ResizeObserver(onLayout).observe(main);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(layout);
  layout();
})();
