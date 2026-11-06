/* Rahasya scenes: 2.5D layers, the Vedic dawn, isometric bricks, ambient motion. No claims live here.
   IKS.iso.brick / IKS.iso.altar are for figures too. Loaded after paper.js. */
(function () {
  'use strict';
  var IKS = window.IKS, doc = document, NS = 'http://www.w3.org/2000/svg', P = IKS.paper;
  function rm() { return !!IKS.reducedMotion; }
  function S(tag, a, parent) { var e = doc.createElementNS(NS, tag); for (var k in (a || {})) e.setAttribute(k, a[k]); if (parent) parent.appendChild(e); return e; }
  function D(cls, parent) { var e = doc.createElement('div'); e.className = cls; if (parent) parent.appendChild(e); return e; }
  function rnd(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------------------------------------------------------- isometric helper */
  var ISO = { cx: 0.866, cy: 0.5 };
  function pt(x, y, z, s) { return ((x - y) * ISO.cx * s).toFixed(1) + ',' + (((x + y) * ISO.cy - z) * s).toFixed(1); }
  /* one brick as a <g> of three faces. c = {t, l, r} colours */
  function brick(g, x, y, z, w, d, h, s, c) {
    var b = S('g', { class: 'brk' }, g);
    S('polygon', { fill: c.l, points: [pt(x, y + d, z, s), pt(x + w, y + d, z, s), pt(x + w, y + d, z + h, s), pt(x, y + d, z + h, s)].join(' ') }, b);
    S('polygon', { fill: c.r, points: [pt(x + w, y, z, s), pt(x + w, y + d, z, s), pt(x + w, y + d, z + h, s), pt(x + w, y, z + h, s)].join(' ') }, b);
    S('polygon', { fill: c.t, points: [pt(x, y, z + h, s), pt(x + w, y, z + h, s), pt(x + w, y + d, z + h, s), pt(x, y + d, z + h, s)].join(' ') }, b);
    return b;
  }
  var CLAY = { t: '#D9794A', l: '#8C3B22', r: '#AE5230' };
  /* a stepped brick fire altar. layers = course widths e.g. [7,5,3]. Returns {svg, bricks, top:[x,y]} */
  function altar(layers, s) {
    s = s || 14;
    var n = layers[0], W = (n * 2) * ISO.cx * s + 8, H = (n + layers.length * 1.1 + 2) * s + 10;
    var svg = S('svg', { class: 'iso', viewBox: (-W / 2) + ' ' + (-(layers.length + 1) * s) + ' ' + W + ' ' + H, 'aria-hidden': 'true', focusable: 'false' });
    var g = S('g', null, svg), all = [], h = 0.72, r = rnd(7);
    layers.forEach(function (m, li) {
      var off = (n - m) / 2;
      for (var sum = 0; sum <= 2 * (m - 1); sum++) for (var x = 0; x < m; x++) {
        var y = sum - x; if (y < 0 || y >= m) continue;
        var tone = 0.92 + r() * 0.16, c = { t: shade(CLAY.t, tone), l: shade(CLAY.l, tone), r: shade(CLAY.r, tone) };
        var b = brick(g, off + x + .03, off + y + .03, li * h, .94, .94, h - .05, s, c);
        b.style.setProperty('--i', all.length); all.push(b);
      }
    });
    return { svg: svg, bricks: all, top: [0, ((n / 2 + n / 2) * ISO.cy - layers.length * h) * s] };
  }
  function shade(hex, f) { var n = parseInt(hex.slice(1), 16), c = function (v) { return Math.max(0, Math.min(255, Math.round(v * f))); }; return 'rgb(' + c(n >> 16) + ',' + c(n >> 8 & 255) + ',' + c(n & 255) + ')'; }
  IKS.iso = { pt: pt, brick: brick, altar: altar, svg: S, shade: shade };

  /* ---------------------------------------------------------- flame */
  function flame(parent) {
    var f = D('flame', parent);
    var svg = S('svg', { viewBox: '0 0 100 150', 'aria-hidden': 'true' }, f);
    [['fl-o', '#E2571E', 'M50 148C14 146 6 112 22 86C30 72 30 56 28 38C44 50 48 62 50 72C54 52 60 26 52 2C74 24 92 62 86 100C82 128 70 146 50 148Z'],
     ['fl-m', '#F2A20C', 'M50 148C26 146 20 118 32 98C38 88 40 78 40 64C50 74 52 84 52 92C58 78 62 60 58 44C72 64 78 88 74 108C70 132 64 146 50 148Z'],
     ['fl-i', '#FFE9A8', 'M50 148C38 146 34 128 42 114C46 108 48 100 48 92C56 102 60 112 60 122C60 136 58 146 50 148Z']].forEach(function (p) {
      S('path', { class: p[0], fill: p[1], d: p[2] }, svg);
    });
    return f;
  }

  /* ---------------------------------------------------------- hills */
  function hills(seed, base, amp, n, W, H) {
    var r = rnd(seed), pts = [], i, d;
    for (i = 0; i <= n; i++) pts.push([i / n * W, base + (r() - .5) * amp * 2 + Math.sin(i * 1.3 + seed) * amp * .5]);
    d = 'M0 ' + H + ' L' + pts[0][0] + ' ' + pts[0][1];
    for (i = 0; i < n; i++) { var a = pts[i], b = pts[i + 1], mx = (a[0] + b[0]) / 2; d += ' C' + mx + ' ' + a[1] + ' ' + mx + ' ' + b[1] + ' ' + b[0] + ' ' + b[1]; }
    return d + ' L' + W + ' ' + H + 'Z';
  }
  function layer(depth, cls, host) { var d = D('dl ' + (cls || ''), host); d.dataset.depth = depth; return d; }
  function fullSvg(parent) { return S('svg', { viewBox: '0 0 1440 900', preserveAspectRatio: 'xMidYMax slice', 'aria-hidden': 'true', focusable: 'false' }, parent); }

  /* ---------------------------------------------------------- the Vedic dawn (title folio) */
  var WORDS = ['अग्निम्', 'ईळे', 'पुरःऽहितम्', 'यज्ञस्य', 'देवम्', 'ऋत्विजम्', 'होतारम्', 'रत्नऽधातमम्'];
  function dawn(host, opts) {
    opts = opts || {};
    var sc = D('dawn'); host.insertBefore(sc, host.firstChild);
    /* stars */
    var st = layer(4, 'stars', sc), r = rnd(21), i;
    for (i = 0; i < 46; i++) { var s = doc.createElement('i'); s.style.cssText = 'left:' + (r() * 100).toFixed(1) + '%;top:' + (r() * 46).toFixed(1) + '%;--d:' + (r() * 6).toFixed(1) + 's;--z:' + (1 + r() * 1.6).toFixed(1) + 'px'; st.appendChild(s); }
    /* the sun, carrying the kolam */
    var sunL = layer(10, 'sunL', sc), sun = D('sun', sunL), rays = S('svg', { class: 'rays', viewBox: '-100 -100 200 200', 'aria-hidden': 'true' }, sun);
    for (i = 0; i < 24; i++) S('path', { d: i % 2 ? 'M-1.6 -66L0 -98L1.6 -66Z' : 'M-2.6 -66L0 -86L2.6 -66Z', transform: 'rotate(' + i * 15 + ')', fill: '#F2A20C' }, rays);
    D('disc', sun);
    if (IKS.motifs && !opts.noKolam) sun.appendChild(IKS.motifs.kolam({ loop: true }));
    /* far hills, river, mid hills */
    var far = fullSvg(layer(18, '', sc)); S('path', { fill: '#3A1E55', d: hills(3, 640, 34, 9, 1440, 900) }, far);
    var mid = fullSvg(layer(30, '', sc)); S('path', { fill: '#27174A', d: hills(9, 690, 26, 8, 1440, 900) }, mid);
    var riv = layer(38, 'river', sc); for (i = 0; i < 16; i++) { var l = doc.createElement('i'); l.style.cssText = 'left:' + (40 + r() * 52).toFixed(1) + '%;top:' + (2 + i * 6) + '%;width:' + (3 + r() * 11).toFixed(1) + '%;--d:' + (r() * 4).toFixed(1) + 's'; riv.appendChild(l); }
    var nearS = fullSvg(layer(52, '', sc)); S('path', { fill: '#120C2C', d: hills(5, 770, 18, 6, 1440, 900) }, nearS);
    /* the altar, its fire, and the first line of the Rigveda rising as sound */
    var al = layer(66, 'altarL', sc), wrap = D('altar-wrap', al), A = altar([7, 5, 3], 15);
    wrap.appendChild(A.svg);
    var fire = D('fire', wrap); D('glow', fire); flame(fire);
    var sp = D('sparks', fire); for (i = 0; i < 16; i++) { var e = doc.createElement('i'); e.style.cssText = '--x:' + ((r() - .5) * 90).toFixed(0) + 'px;--d:' + (r() * 5).toFixed(2) + 's;--t:' + (3 + r() * 3).toFixed(1) + 's'; sp.appendChild(e); }
    var ch = D('chant deva', fire); WORDS.forEach(function (w, k) { var t = doc.createElement('span'); t.textContent = w; t.setAttribute('lang', 'sa'); t.style.cssText = '--k:' + k + ';--x:' + ((k % 2 ? 1 : -1) * (24 + r() * 90)).toFixed(0) + 'px'; ch.appendChild(t); });
    /* kuśa grass in front */
    var gr = fullSvg(layer(95, 'grass', sc));
    for (i = 0; i < 64; i++) { var x = r() * 1440, h = 70 + r() * 110, b = (r() - .5) * 46; var bl = S('path', { class: 'blade', fill: i % 3 ? '#0A0820' : '#2A1B55', d: 'M' + (x - 4) + ' 900 Q' + (x + b * .3) + ' ' + (900 - h * .6) + ' ' + (x + b) + ' ' + (900 - h) + ' Q' + (x + b * .3 + 5) + ' ' + (900 - h * .55) + ' ' + (x + 4) + ' 900Z' }, gr); bl.style.setProperty('--d', (r() * 3).toFixed(2) + 's'); }
    /* build the altar brick by brick */
    if (!rm()) { A.svg.classList.add('is-build'); setTimeout(function () { A.svg.classList.add('is-in'); }, 500); }
    return sc;
  }
  IKS.scene = { dawn: dawn, flame: flame };
  var hero = doc.getElementById('top');
  if (hero) dawn(hero);
  var end = doc.getElementById('sec-11');
  if (end) { var d2 = dawn(end, { noKolam: true }); d2.classList.add('dawn-end'); }

  /* ---------------------------------------------------------- ambient life, one kind per field */
  var AMB = { 'f-night': ['spark', 16], 'f-rani': ['petal', 16], 'f-peacock': ['ripple', 9], 'f-neel': ['syl', 12], 'f-maroon': ['ember', 14], 'f-marigold': ['digit', 14], 'f-ivory': ['mote', 12] };
  var SYL = ['क', 'ट', 'प', 'य', 'अ', 'ग्नि', 'म्', 'र', 'ल', 'व'];
  Array.prototype.forEach.call(doc.querySelectorAll('.seg'), function (seg, si) {
    var kind = null; Object.keys(AMB).forEach(function (k) { if (seg.classList.contains(k)) kind = AMB[k]; });
    if (!kind || rm()) return;
    var a = D('amb amb-' + kind[0]); a.setAttribute('aria-hidden', 'true'); seg.insertBefore(a, seg.firstChild);
    var r = rnd(100 + si);
    for (var i = 0; i < kind[1]; i++) {
      var e = doc.createElement('i');
      e.style.cssText = 'left:' + (6 + r() * 92).toFixed(1) + '%;top:' + (r() * 96).toFixed(1) + '%;--d:' + (-r() * 14).toFixed(1) + 's;--t:' + (9 + r() * 12).toFixed(1) + 's;--s:' + (.6 + r() * .9).toFixed(2);
      if (kind[0] === 'digit') e.textContent = Math.floor(r() * 10);
      if (kind[0] === 'syl') { e.textContent = SYL[Math.floor(r() * SYL.length)]; e.className = 'deva'; }
      a.appendChild(e);
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { a.classList.toggle('on', es[0].isIntersecting); }).observe(seg); else a.classList.add('on');
  });

  /* ---------------------------------------------------------- a floating object per folio, in depth */
  var M = IKS.motifs || {};
  var VIG = { 'sec-2': function () { return M.palmBundle && M.palmBundle({ size: 340 }); }, 'sec-7-table': function () { return M.cipherWheel && M.cipherWheel({ size: 360 }); },
    'sec-7-count': function () { return M.crackedArch && M.crackedArch({ size: 300 }); }, 'sec-8': function () { return M.brokenJaali && M.brokenJaali({ size: 340 }); },
    'sec-7-rsa': function () { var w = doc.createElement('div'); w.className = 'lockkey'; if (M.lock) w.appendChild(M.lock({ size: 190 })); if (M.key) w.appendChild(M.key({ size: 150 })); return w; } };
  Object.keys(VIG).forEach(function (id) {
    var seg = doc.getElementById(id); if (!seg) return;
    var node; try { node = VIG[id](); } catch (e) { node = null; } if (!node) return;
    var v = D('vig'); v.dataset.depth = 34; v.setAttribute('aria-hidden', 'true'); var fl = D('vig-f', v); fl.appendChild(node); seg.insertBefore(v, seg.firstChild);
    if (P) P.inView(seg, function () { if (node.classList) node.classList.add('is-in', 'is-open'); });
  });
  /* later India: the temples belong to the commentary's centuries, not to the Vedic dawn */
  var tb = doc.getElementById('sec-7-table');
  if (tb && M.skyline) { var sk = M.skyline(); sk.classList.add('sk-rani'); tb.insertBefore(sk, tb.firstChild); }

  /* ---------------------------------------------------------- 2.5D: depth follows the pointer and the scroll */
  var canHover = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var layers = [], px = 0, py = 0, tx = 0, ty = 0, raf = 0;
  function collect() { layers = Array.prototype.map.call(doc.querySelectorAll('[data-depth]'), function (n) { return { n: n, d: +n.dataset.depth, host: n.closest('.hero2, .seg') || n.parentNode }; }); }
  collect();
  function frame() {
    raf = 0; tx += (px - tx) * .08; ty += (py - ty) * .08;
    var vh = window.innerHeight;
    layers.forEach(function (l) {
      var r = l.host.getBoundingClientRect(); if (r.bottom < -60 || r.top > vh + 60) return;
      var sc = -(r.top) * (l.d / 100) * .42;
      l.n.style.transform = 'translate3d(' + (tx * l.d * .34).toFixed(1) + 'px,' + (ty * l.d * .14 + sc).toFixed(1) + 'px,0)';
    });
    if (Math.abs(px - tx) > .002 || Math.abs(py - ty) > .002) ask();
  }
  function ask() { if (!raf) raf = requestAnimationFrame(frame); }
  if (!rm()) {
    window.addEventListener('scroll', ask, { passive: true }); window.addEventListener('resize', ask);
    if (canHover) window.addEventListener('pointermove', function (e) { px = e.clientX / window.innerWidth - .5; py = e.clientY / window.innerHeight - .5; ask(); }, { passive: true });
    ask();
    /* figures tilt on their own axis, contents sit at different heights */
    if (canHover) doc.addEventListener('pointermove', function (e) {
      var t = e.target.closest && e.target.closest('figure.leaf'); if (!t) return;
      if (e.target.closest('textarea, details.own')) { t.style.setProperty('--rx', 0); t.style.setProperty('--ry', 0); return; }
      var r = t.getBoundingClientRect();
      t.style.setProperty('--ry', (((e.clientX - r.left) / r.width - .5) * 5).toFixed(2));
      t.style.setProperty('--rx', (((e.clientY - r.top) / r.height - .5) * -4).toFixed(2));
    }, { passive: true });
    doc.addEventListener('pointerout', function (e) { var t = e.target.closest && e.target.closest('figure.leaf'); if (t && !t.contains(e.relatedTarget)) { t.style.setProperty('--rx', 0); t.style.setProperty('--ry', 0); } }, { passive: true });
  }
})();
