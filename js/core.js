/**
 * Rahasya core: window.IKS
 * =====================================================================
 * Load order: core.js, motifs.js, howto.js, story.js, home.js, levels/*.js, main.js
 * Classic script (works from file://). No modules, no fetch.
 *
 * ---- Registering a level ------------------------------------------------
 *   IKS.registerLevel({
 *     id: 'chant', num: 1, title: "The Guru's Chant", tagline: 'Find the changed word',
 *     goal: 'Integrity',        // Integrity | Confidentiality | Weakness | Public key
 *     era: 'Vedic recitation',
 *     sources: [ { n: 12, text: 'Filliozat 2006, *Vedic chant*', tier: 'W', url: 'https://…' } ],
 *     mount(root, api) { …build into root…; return function cleanup() {}; }
 *   });
 *   Source text may use *asterisks* for italics. Tier: P primary, R peer-reviewed,
 *   T report/preprint, W overview only, B book, O our own test.
 *
 * ---- api (second argument of mount) -------------------------------------
 *   api.el(tag, attrs, ...children)  DOM builder. attrs: class, text, html (avoid), on:{click:fn},
 *                                    style (string | object, "--x" keys ok), aria-*, data-*,
 *                                    value/checked/disabled/hidden set as properties, true => ''.
 *                                    Children: string | number | Node | array | null. SVG tags
 *                                    (svg, path, circle, g, line, rect, text, polygon, polyline,
 *                                    ellipse, defs, use, linearGradient, stop, clipPath, mask)
 *                                    are created in the SVG namespace automatically.
 *   api.round(i, total, title, goal) Header round indicator: diyas 1..i-1 lit, i glowing. Also sets the pinned
 *                                    "This round" goal line: `goal` if given, else IKS.howto.data[id].goals[i-1].
 *                                    A title starting "Finale" is shown as-is, without "Round i of n".
 *   api.goal(text)                   Update the pinned goal line mid-round. “Curly quotes” mark a control label.
 *   api.correct(el?, msg?)           Peacock pulse ring on el + aria-live "Correct." (or msg).
 *   api.wrong(el?, msg?)             Sindoor 6px shake (240ms) + aria-live "Not quite." (or msg).
 *   api.say(msg)                     aria-live polite announcement (no visual).
 *   api.toast(msg, kind)             kind: 'info' | 'good' | 'bad'.
 *   api.complete({stars})            stars 1-3. Saves best, runs celebration (lotus opens, kolam
 *                                    draws, diyas light, marigold petals), then offers
 *                                    "Continue the story". Returns a Promise. Call once.
 *   api.sourceBox(sources)           Returns the palm-leaf Sources element. Append it at the
 *                                    bottom of your level. If you never call it, core appends
 *                                    one for you from the registered `sources`.
 *   api.explain(title, bodyNodes)    Returns collapsible "Why this works" panel.
 *   api.sleep(ms)                    Promise. Resolves instantly under reduced motion. After the
 *                                    level is left it never resolves (async code just stops).
 *   api.alive()                      false once the level has been left.
 *   api.reducedMotion                boolean (live getter).
 *   api.onExit(fn)                   Register cleanup (timers, listeners).
 *   api.anim / api.ui / api.motifs   Same objects as IKS.anim / IKS.ui / IKS.motifs.
 *
 * ---- Shared objects -----------------------------------------------------
 *   IKS.store.get(key, fallback) / .set(key, val) / .remove(key)   localStorage in try/catch.
 *   IKS.logic = {}                   Put pure logic here: IKS.logic.chant = {...}.
 *   IKS.reducedMotion                boolean getter.
 *   IKS.getStars(id) / IKS.setStars(id, n)   best stars (0-3).
 *   IKS.anim.drawKolam(svg, {loop, dots, size})   fills svg with a dot-first kolam, returns svg.
 *   IKS.anim.petals(container, {x, y, count})     marigold burst (<= 40, auto-removed).
 *   IKS.anim.stagger(nodes, {step, y, duration})  fade-up in 40ms steps.
 *   IKS.anim.fadeUp(el), .pulse(el, color), .shake(el)
 *   IKS.anim.flipText(el, text, ms)   Promise; letter-flip (rotateX) to new text.
 *   IKS.anim.roll(el, from, to, ms)   Promise; number rolls (Number only; format fn optional).
 *   IKS.anim.observe(el, cb, opts)    IntersectionObserver wrapper; cb fires once, returns stop().
 *   IKS.ui.diya({lit, size, flicker}) / IKS.ui.diyas(total, lit)
 *   IKS.ui.bud()                      small lotus-bud svg (currentColor)
 *   IKS.ui.chip(goal, label?)         goal chip (colour by goal).
 *   IKS.ui.tierBadge(tier)
 *   IKS.ui.sourceBox(sources) / IKS.ui.explain(title, body)
 *   IKS.ui.gameCard(id)               arch game card used inside the story.
 *   IKS.ui.toast / IKS.ui.say
 *   IKS.motifs.*                      see motifs.js
 *
 * ---- Reusable CSS classes (css/base.css) ---------------------------------
 *   Buttons  .btn  .btn-primary  .btn-gold  .btn-ghost  .btn-sm
 *   Chips    .chip  + .goal-integrity | .goal-confidentiality | .goal-weakness | .goal-public | .goal-encoding
 *   Surfaces .card  .panel  .tile (interactive, lifts on hover)  .callout.good|.bad|.info
 *   Layout   .stack (vertical gap)  .row  .grid  .sr-only  .deva (Devanagari/IAST font)  .mono
 *   Fields   .lvl-field-ivory|night|peacock|maroon on a wrapper for jewel backgrounds
 *   Feedback .fx-good  .fx-bad  (added/removed by api.correct/wrong)
 *   Tokens   --ivory --paper --ink --ink-soft --neel --marigold --sindoor --peacock --lotus
 *            --haldi --gold --gold-soft --maroon --night --peacock-deep --line
 *            --font-display --font-body --font-deva --ease --ease-big
 *   Every level selector MUST be prefixed with .lvl-<id> (core puts that class on the frame).
 */
(function () {
  'use strict';
  var G = typeof window !== 'undefined' ? window : globalThis;
  var IKS = G.IKS = G.IKS || {};
  IKS.logic = IKS.logic || {};

  /* ------------------------------------------------------------ store */
  var NS = 'rahasya.';
  var mem = {};
  IKS.store = {
    get: function (key, fallback) {
      try {
        var raw = G.localStorage.getItem(NS + key);
        if (raw === null) return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : fallback;
        return JSON.parse(raw);
      } catch (e) {
        return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : fallback;
      }
    },
    set: function (key, val) {
      mem[key] = val;
      try { G.localStorage.setItem(NS + key, JSON.stringify(val)); } catch (e) { /* private mode */ }
      return val;
    },
    remove: function (key) {
      delete mem[key];
      try { G.localStorage.removeItem(NS + key); } catch (e) { /* ignore */ }
    }
  };

  if (typeof document === 'undefined') return; // node: store + logic only

  /* ------------------------------------------------- reduced motion */
  var mq = G.matchMedia ? G.matchMedia('(prefers-reduced-motion: reduce)') : null;
  Object.defineProperty(IKS, 'reducedMotion', { get: function () { return !!(mq && mq.matches); } });

  /* ------------------------------------------------------ DOM builder */
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var SVG_TAGS = { svg: 1, path: 1, circle: 1, g: 1, line: 1, rect: 1, text: 1, tspan: 1, polygon: 1, polyline: 1,
    ellipse: 1, defs: 1, use: 1, lineargradient: 1, radialgradient: 1, stop: 1, clippath: 1, mask: 1, filter: 1,
    feturbulence: 1, fecolormatrix: 1, pattern: 1 };
  var PROPS = { value: 1, checked: 1, disabled: 1, selected: 1, hidden: 1 };

  function setStyle(node, style) {
    if (typeof style === 'string') { node.setAttribute('style', style); return; }
    for (var k in style) {
      if (style[k] == null) continue;
      if (k.indexOf('-') >= 0) node.style.setProperty(k, style[k]); else node.style[k] = style[k];
    }
  }
  function append(node, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { for (var i = 0; i < c.length; i++) append(node, c[i]); return; }
    if (c.nodeType) { node.appendChild(c); return; }
    node.appendChild(document.createTextNode(String(c)));
  }
  function el(tag, attrs) {
    var isSvg = !!SVG_TAGS[String(tag).toLowerCase()];
    var node = isSvg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
    if (attrs && typeof attrs === 'object' && !attrs.nodeType && !Array.isArray(attrs)) {
      for (var key in attrs) {
        var v = attrs[key];
        if (v == null || v === false) continue;
        if (key === 'class' || key === 'className') node.setAttribute('class', Array.isArray(v) ? v.join(' ') : v);
        else if (key === 'text') node.textContent = v;
        else if (key === 'html') node.innerHTML = v;
        else if (key === 'on') { for (var ev in v) node.addEventListener(ev, v[ev]); }
        else if (key === 'style') setStyle(node, v);
        else if (!isSvg && PROPS[key]) node[key] = v;
        else node.setAttribute(key, v === true ? '' : v);
      }
      for (var i = 2; i < arguments.length; i++) append(node, arguments[i]);
    } else {
      for (var j = 1; j < arguments.length; j++) append(node, arguments[j]);
    }
    return node;
  }
  IKS.el = el;

  var WAAPI = typeof Element !== 'undefined' && !!Element.prototype.animate;
  var EASE = 'cubic-bezier(.2,.8,.2,1)';
  function sleepRaw(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }
  function rm() { return IKS.reducedMotion; }

  /* ------------------------------------------------------------ anim */
  var anim = IKS.anim = {};

  anim.fadeUp = function (node, o) {
    o = o || {};
    if (rm() || !WAAPI || !node) return;
    node.animate([{ opacity: 0, transform: 'translateY(' + (o.y == null ? 16 : o.y) + 'px)' }, { opacity: 1, transform: 'none' }],
      { duration: o.duration || 380, delay: o.delay || 0, easing: EASE, fill: 'backwards' });
  };
  anim.stagger = function (nodes, o) {
    o = o || {};
    var list = Array.prototype.slice.call(nodes || []);
    list.forEach(function (n, i) { anim.fadeUp(n, { y: o.y, duration: o.duration, delay: (o.start || 0) + i * (o.step || 40) }); });
  };
  anim.pulse = function (node, color) {
    if (!node) return;
    node.classList.add('fx-good');
    setTimeout(function () { node.classList.remove('fx-good'); }, 700);
    if (rm() || !WAAPI) return;
    var c = color || 'rgba(15,122,120,.6)';
    node.animate([{ boxShadow: '0 0 0 0 ' + c }, { boxShadow: '0 0 0 14px rgba(15,122,120,0)' }], { duration: 560, easing: 'ease-out' });
  };
  anim.shake = function (node) {
    if (!node) return;
    node.classList.add('fx-bad');
    setTimeout(function () { node.classList.remove('fx-bad'); }, 700);
    if (rm() || !WAAPI) return;
    node.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' },
      { transform: 'translateX(-4px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }], { duration: 240, easing: 'ease-in-out' });
  };
  anim.flipText = function (node, text, ms) {
    ms = ms || 320;
    if (rm() || !WAAPI) { node.textContent = text; return Promise.resolve(); }
    var a = node.animate([{ transform: 'rotateX(0)' }, { transform: 'rotateX(90deg)' }], { duration: ms / 2, easing: 'ease-in', fill: 'forwards' });
    return a.finished.then(function () {
      node.textContent = text;
      var b = node.animate([{ transform: 'rotateX(-90deg)' }, { transform: 'rotateX(0)' }], { duration: ms / 2, easing: 'ease-out' });
      a.cancel();
      return b.finished;
    }).catch(function () { node.textContent = text; });
  };
  anim.roll = function (node, from, to, ms, fmt) {
    ms = ms || 700;
    fmt = fmt || String;
    if (rm()) { node.textContent = fmt(to); return Promise.resolve(); }
    return new Promise(function (res) {
      var t0 = null;
      function step(t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
        node.textContent = fmt(Math.round(from + (to - from) * e));
        if (p < 1) requestAnimationFrame(step); else res();
      }
      requestAnimationFrame(step);
    });
  };
  /** Calls cb once when node is >= `threshold` visible. Fires immediately without IntersectionObserver. */
  anim.observe = function (node, cb, o) {
    o = o || {};
    if (typeof G.IntersectionObserver !== 'function') { cb(); return function () {}; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { if (!o.repeat) io.disconnect(); cb(e); }
      });
    }, { threshold: o.threshold == null ? 0.2 : o.threshold, rootMargin: o.rootMargin || '0px 0px -8% 0px' });
    io.observe(node);
    return function () { io.disconnect(); };
  };

  /* Marigold petals: DOM, <= 40, auto-removed. container must be positioned. */
  anim.petals = function (container, o) {
    o = o || {};
    if (rm() || !WAAPI || !container) return;
    var n = Math.min(40, o.count || 32);
    var rect = container.getBoundingClientRect();
    var x = o.x == null ? rect.width / 2 : o.x, y = o.y == null ? rect.height * 0.45 : o.y;
    var layer = el('div', { class: 'petal-layer', 'aria-hidden': 'true' });
    container.appendChild(layer);
    var left = n;
    function done() { if (--left <= 0 && layer.parentNode) layer.parentNode.removeChild(layer); }
    for (var i = 0; i < n; i++) {
      var p = el('span', { class: 'petal' + (i % 3 === 0 ? ' petal-deep' : '') });
      p.style.left = x + 'px'; p.style.top = y + 'px';
      layer.appendChild(p);
      var ang = (-Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 1.25;
      var dist = 90 + Math.random() * 190;
      var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
      var rot = (Math.random() - 0.5) * 540;
      var a = p.animate([
        { transform: 'translate(-50%,-50%) scale(.3) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1) rotate(' + rot * 0.5 + 'deg)', opacity: 1, offset: 0.45 },
        { transform: 'translate(' + dx * 1.25 + 'px,' + (dy + 170 + Math.random() * 90) + 'px) scale(.8) rotate(' + rot + 'deg)', opacity: 0 }
      ], { duration: 1500 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.3,1)', delay: Math.random() * 120, fill: 'forwards' });
      a.onfinish = done; a.oncancel = done;
    }
    setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, 3200);
  };

  /* Kolam: dots first (staggered), then the line traces through them. viewBox 240. */
  function polar(r, deg) { var a = deg * Math.PI / 180; return [120 + r * Math.cos(a), 120 + r * Math.sin(a)]; }
  function f(n) { return Math.round(n * 10) / 10; }
  function kolamPaths() {
    var out = [];
    var i, p;
    // 4 big petals
    for (i = 0; i < 4; i++) out.push({ d: 'M120 120 C96 96 96 44 120 18 C144 44 144 96 120 120Z', rot: i * 90, cls: 'k1' });
    // 4 diagonal petals
    for (i = 0; i < 4; i++) out.push({ d: 'M120 120 C104 106 104 74 120 54 C136 74 136 106 120 120Z', rot: 45 + i * 90, cls: 'k2' });
    // scalloped ring (16 arcs)
    var d = '', r = 66, pts = [];
    for (i = 0; i < 16; i++) pts.push(polar(r, i * 22.5));
    d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
    for (i = 1; i <= 16; i++) { p = pts[i % 16]; d += ' A12.6 12.6 0 0 1 ' + f(p[0]) + ' ' + f(p[1]); }
    out.push({ d: d + 'Z', cls: 'k3' });
    // outer caps (8)
    d = '';
    for (i = 0; i < 8; i++) {
      var a = i * 45 + 22.5, p0 = polar(98, a - 9), c1 = polar(128, a - 11), c2 = polar(128, a + 11), p1 = polar(98, a + 9);
      d += 'M' + f(p0[0]) + ' ' + f(p0[1]) + ' C' + f(c1[0]) + ' ' + f(c1[1]) + ' ' + f(c2[0]) + ' ' + f(c2[1]) + ' ' + f(p1[0]) + ' ' + f(p1[1]) + ' ';
    }
    out.push({ d: d, cls: 'k4' });
    // inner ring
    out.push({ d: 'M120 104 A16 16 0 1 1 119.9 104Z', cls: 'k1' });
    return out;
  }
  anim.drawKolam = function (svg, o) {
    o = o || {};
    svg.setAttribute('viewBox', '0 0 240 240');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('kolam');
    svg.classList.add(o.loop ? 'loop' : 'draw');
    svg.textContent = '';
    var idx = 0;
    // pulli dots: ring of 8 at 112, 8 at 80, 4 mid, centre
    var dots = [[120, 120]];
    var k;
    for (k = 0; k < 8; k++) { dots.push(polar(112, k * 45 + 22.5)); dots.push(polar(80, k * 45)); }
    for (k = 0; k < 4; k++) dots.push(polar(40, k * 90 + 45));
    dots.forEach(function (pt, n) {
      svg.appendChild(el('circle', { class: 'pulli', cx: f(pt[0]), cy: f(pt[1]), r: 2.4, style: { '--i': n } }));
    });
    kolamPaths().forEach(function (pp) {
      var attrs = { class: pp.cls, d: pp.d, pathLength: 1, style: { '--i': idx++ } };
      if (pp.rot) attrs.transform = 'rotate(' + pp.rot + ' 120 120)';
      svg.appendChild(el('path', attrs));
    });
    return svg;
  };

  /* -------------------------------------------------------------- ui */
  var ui = IKS.ui = {};

  function goalClass(goal) {
    var g = String(goal || '').toLowerCase();
    if (g.indexOf('integ') === 0) return 'goal-integrity';
    if (g.indexOf('conf') === 0) return 'goal-confidentiality';
    if (g.indexOf('weak') === 0 || g.indexOf('attack') === 0) return 'goal-weakness';
    if (g.indexOf('public') === 0) return 'goal-public';
    if (g.indexOf('enc') === 0) return 'goal-encoding';
    if (g.indexOf('hid') === 0 || g.indexOf('access') === 0) return 'goal-hidden';
    return '';
  }
  ui.goalClass = goalClass;
  ui.chip = function (goal, label) { return el('span', { class: 'chip ' + goalClass(goal) }, label || goal); };

  ui.diya = function (o) {
    o = o || {};
    return el('span', { class: 'diya' + (o.lit ? ' is-lit' : '') + (o.flicker ? ' flicker' : ''), 'aria-hidden': 'true', style: o.size ? { '--d': o.size + 'px' } : null },
      el('svg', { viewBox: '0 0 32 34', focusable: 'false' },
        el('ellipse', { class: 'halo', cx: 16, cy: 12, rx: 13, ry: 13 }),
        el('path', { class: 'flame', d: 'M16 2 C21.5 8.5 21.5 14 16 19 C10.5 14 10.5 8.5 16 2Z' }),
        el('path', { class: 'flame-in', d: 'M16 9 C18.6 12 18.6 15 16 17.6 C13.4 15 13.4 12 16 9Z' }),
        el('path', { class: 'bowl', d: 'M2.5 20.5 H29.5 C29.5 27.5 23.5 32 16 32 C8.5 32 2.5 27.5 2.5 20.5Z' }),
        el('path', { class: 'rim', d: 'M5 24 H27' })));
  };
  ui.diyas = function (total, lit, o) {
    var w = el('span', { class: 'diyas', role: 'img', 'aria-label': lit + ' of ' + total + ' lamps lit' });
    for (var i = 0; i < total; i++) w.appendChild(ui.diya({ lit: i < lit, size: o && o.size }));
    return w;
  };

  /** small lotus bud (currentColor), used as a margin-note marker and bullet */
  ui.bud = function () {
    return el('svg', { viewBox: '0 0 16 20', focusable: 'false', 'aria-hidden': 'true' },
      el('path', { d: 'M8 1 C12.2 6.5 12.2 12 8 16.5 C3.8 12 3.8 6.5 8 1Z' }),
      el('path', { d: 'M8 16.5 C3.4 16.5 0.8 12.6 0.8 8.6 C4.6 9.4 7.2 12 8 16.5Z', opacity: '.7' }),
      el('path', { d: 'M8 16.5 C12.6 16.5 15.2 12.6 15.2 8.6 C11.4 9.4 8.8 12 8 16.5Z', opacity: '.7' }));
  };

  var TIERS = {
    P: ['P', 'primary text'], R: ['R', 'peer-reviewed'], T: ['T', 'report / preprint'], W: ['W', 'overview only'],
    B: ['B', 'book'], O: ['O', 'our own test']
  };
  function tierKey(t) { t = String(t || 'W').trim(); if (/^book/i.test(t)) return 'B'; if (/^our|^own/i.test(t)) return 'O'; return t.charAt(0).toUpperCase(); }
  ui.tierBadge = function (tier) {
    var k = tierKey(tier), info = TIERS[k] || [k, 'source'];
    return el('span', { class: 'tier tier-' + k, title: info[1] }, el('span', { 'aria-hidden': 'true' }, info[0]), el('span', { class: 'sr-only' }, info[1]));
  };

  function richText(text) {
    var out = [], parts = String(text).split(/\*([^*]+)\*/);
    for (var i = 0; i < parts.length; i++) { if (!parts[i]) continue; out.push(i % 2 ? el('em', null, parts[i]) : parts[i]); }
    return out;
  }
  ui.richText = richText;

  var sourceCalls = 0;
  ui.sourceBox = function (sources, o) {
    o = o || {};
    sourceCalls++;
    var used = {};
    var list = el('ul', { class: 'src-list' });
    (sources || []).forEach(function (s) {
      used[tierKey(s.tier)] = 1;
      var li = el('li', { class: 'src' }, ui.tierBadge(s.tier),
        el('span', { class: 'src-text' }, s.n != null ? el('span', { class: 'src-n' }, '[' + s.n + '] ') : null, richText(s.text || '')));
      if (s.url) li.appendChild(el('a', { class: 'src-link', href: s.url, target: '_blank', rel: 'noopener noreferrer' }, 'Open link', el('span', { class: 'sr-only' }, ' (new tab)'), ' ↗'));
      list.appendChild(li);
    });
    var legend = 'P primary · R peer-reviewed · T report/preprint · W overview only';
    if (used.B) legend += ' · B book';
    if (used.O) legend += ' · O our own test';
    return el('section', { class: 'palm-box', 'aria-label': 'Sources' },
      el('span', { class: 'hole hole-l', 'aria-hidden': 'true' }), el('span', { class: 'hole hole-r', 'aria-hidden': 'true' }),
      el('span', { class: 'palm-cord', 'aria-hidden': 'true' }), el('span', { class: 'palm-tassel', 'aria-hidden': 'true' }),
      el('header', { class: 'palm-head' }, el('h3', null, '\uD83D\uDCDC ' + (o.title || 'Sources'))),
      list, el('p', { class: 'tier-legend' }, legend));
  };

  var explainCount = 0;
  /** "Why this works": a manuscript margin note. A real button toggles it (aria-expanded). */
  ui.explain = function (title, body) {
    var id = 'explain-' + (++explainCount), isOpen = false;
    var btn = el('button', { type: 'button', class: 'explain-btn', 'aria-expanded': 'false', 'aria-controls': id },
      el('span', { class: 'explain-bud', 'aria-hidden': 'true' }, ui.bud()),
      el('span', { class: 'explain-q' }, 'Why this works'),
      title ? el('span', { class: 'explain-title' }, title) : null,
      el('span', { class: 'explain-sign', 'aria-hidden': 'true' }));
    var panel = el('div', { class: 'explain-panel', id: id },
      el('div', { class: 'explain-body' }, typeof body === 'string' ? el('p', null, body) : body));
    var d = el('div', { class: 'explain' }, btn, panel);
    function set(v) {
      v = !!v;
      if (v === isOpen) return;
      isOpen = v;
      d.classList.toggle('is-open', v);
      btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    }
    btn.addEventListener('click', function () { set(!isOpen); });
    /* same API as the old <details>: levels may set explainEl.open = true */
    Object.defineProperty(d, 'open', { get: function () { return isOpen; }, set: set });
    return d;
  };

  /* live region + toast */
  var live, toastWrap, liveTimer;
  function ensureLive() {
    if (!live) {
      live = document.getElementById('live') || el('div', { id: 'live', class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
      if (!live.parentNode) document.body.appendChild(live);
    }
    if (!toastWrap) {
      toastWrap = document.getElementById('toasts') || el('div', { id: 'toasts', class: 'toast-wrap' });
      if (!toastWrap.parentNode) document.body.appendChild(toastWrap);
    }
  }
  ui.say = function (msg) {
    ensureLive();
    live.textContent = '';
    clearTimeout(liveTimer);
    liveTimer = setTimeout(function () { live.textContent = msg; }, 40);
  };
  ui.toast = function (msg, kind) {
    ensureLive();
    var t = el('div', { class: 'toast toast-' + (kind || 'info') }, msg);
    toastWrap.appendChild(t);
    anim.fadeUp(t, { y: 10, duration: 260 });
    setTimeout(function () {
      if (WAAPI && !rm()) {
        var a = t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, fill: 'forwards' });
        a.onfinish = function () { if (t.parentNode) t.parentNode.removeChild(t); };
      } else if (t.parentNode) t.parentNode.removeChild(t);
    }, 3400);
  };

  /* ------------------------------------------------- games / registry */
  var S = { levels: {}, view: null, started: false, cameFrom: null };
  var FALLBACK = {
    chant: { num: 1, title: "The Guru's Chant", goal: 'Integrity', era: 'Vedic recitation', playable: true },
    spy: { num: 2, title: 'Spy at the Gate', goal: 'Confidentiality', era: 'Arthashastra', playable: false },
    cipher: { num: 3, title: "The Courtesan's Code", goal: 'Confidentiality', era: 'Jayamaṅgalā', playable: true },
    breakit: { num: 4, title: 'Break It!', goal: 'Weakness', era: 'Our test', playable: true },
    katapayadi: { num: 5, title: 'Katapayadi Lock', goal: 'Encoding', era: 'Encoding', playable: false },
    twilight: { num: 6, title: 'Twilight Verse', goal: 'Hidden meaning', era: 'Charyapada', playable: false },
    rsa: { num: 7, title: 'Pivot to RSA', goal: 'Public key', era: '1977', playable: true },
    where: { num: 8, title: 'Where you use RSA', goal: 'Public key', era: 'Today', playable: false }
  };

  IKS.registerLevel = function (def) {
    if (!def || !def.id || typeof def.mount !== 'function') { if (G.console) console.warn('registerLevel: need id and mount()'); return; }
    S.levels[def.id] = def;
  };
  function story() { return IKS.story || { games: {}, chapters: [] }; }
  function meta(id) {
    var m = {}, k, src = [FALLBACK[id], (story().games || {})[id], S.levels[id]];
    src.forEach(function (o) { if (o) for (k in o) if (k !== 'mount') m[k] = o[k]; });
    m.id = id;
    m.registered = !!S.levels[id];
    return m;
  }
  function allGameIds() {
    var ids = {}, k;
    for (k in FALLBACK) ids[k] = 1;
    for (k in (story().games || {})) ids[k] = 1;
    for (k in S.levels) ids[k] = 1;
    return Object.keys(ids).sort(function (a, b) { return (meta(a).num || 99) - (meta(b).num || 99); });
  }
  IKS.gameMeta = meta;
  IKS.gameIds = allGameIds;
  IKS.getStars = function (id) { return Math.max(0, Math.min(3, +IKS.store.get('stars.' + id, 0) || 0)); };
  IKS.setStars = function (id, n) { var best = Math.max(IKS.getStars(id), Math.min(3, Math.max(0, n | 0))); IKS.store.set('stars.' + id, best); return best; };
  IKS.totalStars = function () { return allGameIds().reduce(function (a, id) { return a + IKS.getStars(id); }, 0); };
  IKS.playableCount = function () { return allGameIds().filter(function (id) { return meta(id).playable; }).length; };

  function chapterOfGame(id) {
    var chs = story().chapters || [];
    for (var i = 0; i < chs.length; i++) if ((chs[i].games || []).indexOf(id) >= 0) return { ch: chs[i], index: i };
    return null;
  }
  function nextChapterId(id) {
    var c = chapterOfGame(id), chs = story().chapters || [];
    return c && chs[c.index + 1] ? chs[c.index + 1].id : null;
  }
  IKS.chapterOfGame = chapterOfGame;
  IKS.nextChapterId = nextChapterId;
  function nextPlayable(id) {
    var me = meta(id).num || 0, ids = allGameIds();
    for (var i = 0; i < ids.length; i++) { var m = meta(ids[i]); if (m.num > me && S.levels[ids[i]]) return m; }
    return null;
  }

  /** Arch game card used inside the story. */
  ui.gameCard = function (id) {
    var m = meta(id), stars = IKS.getStars(id);
    var live_ = m.playable && m.registered, building = m.playable && !m.registered;
    var tag = live_ ? 'a' : 'div';
    var attrs = {
      class: 'game-card' + (live_ ? ' is-live' : building ? ' is-building' : ' is-stub') + (live_ && !stars ? ' is-unplayed' : ''),
      'data-game': id
    };
    if (live_) attrs.href = '#/level/' + id; else attrs['aria-disabled'] = 'true';
    var frame = IKS.motifs && IKS.motifs.archFrame ? IKS.motifs.archFrame() : null;
    return el(tag, attrs,
      frame,
      el('div', { class: 'gc-inner' },
        el('span', { class: 'gc-num', 'aria-hidden': 'true' }, String(m.num || '')),
        el('p', { class: 'gc-kicker' }, 'Game ' + (m.num || '')),
        el('h3', { class: 'gc-title' }, m.title || id),
        m.tagline ? el('p', { class: 'gc-tag' }, m.tagline) : null,
        el('div', { class: 'gc-meta' }, ui.chip(m.goal, m.goalLabel), m.era ? el('span', { class: 'gc-era' }, m.era) : null),
        live_ ? el('div', { class: 'gc-foot' }, ui.diyas(3, stars), el('span', { class: 'gc-play' }, stars ? 'Play again' : 'Play', el('span', { 'aria-hidden': 'true' }, ' →')))
          : el('div', { class: 'gc-foot' }, ui.diyas(3, 0), el('span', { class: 'gc-soon' }, building ? 'Building…' : 'Coming soon'))));
  };

  /* ---------------------------------------------------------- views */
  var app, topProgress;

  function teardown() {
    var v = S.view;
    S.view = null;
    if (!v) return;
    v.alive = false;
    (v.timers || []).forEach(clearTimeout);
    (v.exits || []).slice().reverse().forEach(function (fn) { try { fn(); } catch (e) { if (G.console) console.error(e); } });
    if (v.destroy) { try { v.destroy(); } catch (e2) { if (G.console) console.error(e2); } }
    var cel = document.querySelector('.celebrate');
    if (cel && cel.parentNode) cel.parentNode.removeChild(cel);
    document.body.classList.remove('has-overlay');
    app.textContent = '';
  }

  function parseHash() {
    var h = G.location.hash || '', m;
    if ((m = /^#\/level\/([\w-]+)/.exec(h))) return { name: 'level', id: m[1] };
    if ((m = /^#\/s\/([\w-]+)/.exec(h))) return { name: 'story', chapter: m[1] };
    return { name: 'story' };
  }

  function updateProgress() {
    if (!topProgress) return;
    topProgress.textContent = '';
    var max = IKS.playableCount() * 3;
    topProgress.appendChild(ui.diya({ lit: IKS.totalStars() > 0, size: 18 }));
    topProgress.appendChild(el('span', null, IKS.totalStars() + ' / ' + max));
    topProgress.setAttribute('aria-label', IKS.totalStars() + ' of ' + max + ' lamps lit');
  }
  IKS.updateProgress = updateProgress;

  function setTitle(t) { document.title = t ? t + ' — Rahasya' : 'Rahasya · रहस्य'; }

  function route() {
    var r = parseHash();
    document.body.classList.toggle('is-level', r.name === 'level');
    if (r.name === 'story' && S.view && S.view.kind === 'story') {
      if (S.view.goto) S.view.goto(r.chapter);
      return;
    }
    var prevLevel = S.view && S.view.kind === 'level' ? S.view.id : null;
    teardown();
    G.scrollTo(0, 0);
    if (r.name === 'level') showLevel(r.id); else showStory(r.chapter, prevLevel);
    updateProgress();
  }

  function showStory(chapter, prevLevel) {
    setTitle('');
    var host = el('div', { class: 'view view-story' });
    app.appendChild(host);
    var v = S.view = { kind: 'story', alive: true };
    if (!chapter && prevLevel) { var c = chapterOfGame(prevLevel); if (c) chapter = c.ch.id; }
    if (IKS.home && IKS.home.render) {
      var h = IKS.home.render(host, { chapter: chapter });
      v.destroy = h && h.destroy;
      v.goto = h && h.goto;
    } else {
      host.appendChild(el('main', { class: 'container', style: { padding: '120px 20px' } }, el('h1', { class: 'display' }, 'Rahasya'), el('p', null, 'The story file did not load.')));
    }
  }

  function showLevel(id) {
    var m = meta(id);
    var def = S.levels[id];
    var known = !!(FALLBACK[id] || (story().games || {})[id] || def);
    if (!known) { G.location.replace('#/'); return; }
    setTitle('Game ' + (m.num || '') + ': ' + (m.title || id));
    var v = S.view = { kind: 'level', id: id, alive: true, exits: [], timers: [] };

    var chap = chapterOfGame(id);
    var backHref = chap ? '#/s/' + chap.ch.id : '#/';
    var diyaWrap = el('span', { class: 'round-diyas' });
    var roundLabel = el('span', { class: 'round-label' });
    var body = el('div', { class: 'frame-body lvl-body' });
    var foot = el('div', { class: 'frame-foot', hidden: true });
    var autoSources = el('div', { class: 'frame-sources' });
    var roundBox = el('div', { class: 'frame-round', hidden: true }, roundLabel, diyaWrap);
    var h1 = el('h1', { class: 'frame-title', tabindex: '-1' }, m.title || id);

    // how to play, told through the story (js/howto.js). Never gates play.
    var hw = IKS.howto && IKS.howto.briefing && IKS.howto.data && IKS.howto.data[id] ? IKS.howto.briefing(id) : null;

    // the pinned "This round" goal line
    var goalT = el('span', { class: 'fg-t' });
    var goalBar = el('div', { class: 'frame-goal', hidden: true },
      el('span', { class: 'fg-k' }, el('span', { class: 'fg-bud', 'aria-hidden': 'true' }, ui.bud()), 'This round'), goalT);
    function setGoal(text) {
      if (!text) { goalBar.hidden = true; return; }
      if (goalBar.hidden === false && goalBar._text === text) return;
      goalBar._text = text;
      goalT.textContent = '';
      var parts = IKS.howto && IKS.howto.rich ? IKS.howto.rich(text) : [text];
      parts.forEach(function (p) { goalT.appendChild(p.nodeType ? p : document.createTextNode(p)); });
      goalBar.hidden = false;
      anim.fadeUp(goalT, { y: 5, duration: 260 });
    }

    var TEXTURE = { chant: '\u0936\u094D\u0930\u0941\u0924\u093F', cipher: '\u0917\u0941\u092A\u094D\u0924', breakit: '\u092D\u0947\u0926', rsa: '\u0915\u0941\u091E\u094D\u091C\u0940' };
    var DEVD = '\u0966\u0967\u0968\u0969\u096A\u096B\u096C\u096D\u096E\u096F';
    function devNum(n) { return String(n).replace(/\d/g, function (d) { return DEVD.charAt(+d); }); }

    var shell = el('div', { class: 'fh-shell' },
      TEXTURE[id] ? el('span', { class: 'fh-texture deva', 'aria-hidden': 'true' }, TEXTURE[id]) : null,
      el('div', { class: 'frame-inner' },
        el('div', { class: 'frame-main' },
          el('div', { class: 'frame-num', 'aria-hidden': 'true' },
            el('span', { class: 'fn-kh deva', lang: 'hi' }, '\u0916\u0947\u0932'), el('span', { class: 'fn-n deva' }, devNum(m.num || ''))),
          el('div', { class: 'frame-titles' },
            el('p', { class: 'frame-kicker' }, 'Game ' + (m.num || '')),
            h1,
            m.tagline ? el('p', { class: 'frame-tagline' }, m.tagline) : null,
            el('div', { class: 'frame-meta' }, ui.chip(m.goal, m.goalLabel), m.era ? el('span', { class: 'frame-era' }, m.era) : null, hw ? hw.button : null))),
        roundBox));
    var head = el('header', { class: 'frame-head jewel-' + id }, shell);
    if (IKS.howto && IKS.howto.frameShape) IKS.howto.frameShape(head, shell, { cw: 360, ch: 46, r: 18, inset: 6 });
    var back = el('a', { class: 'frame-back', href: backHref }, el('span', { class: 'fb-arrow', 'aria-hidden': 'true' }, '\u2190'), el('span', null, 'Back to story'));

    var frame = el('main', { class: 'level-frame lvl-' + id + ' ' + ui.goalClass(m.goal), id: 'main' }, back, head, goalBar, hw ? hw.node : null, body, autoSources, foot);
    var view = el('div', { class: 'view view-level' }, frame);
    app.appendChild(view);
    anim.fadeUp(body, { delay: 120 });

    // ---- api
    var sourceUsed = false;
    function mkSources(list) { return ui.sourceBox(list || m.sources || (def && def.sources) || []); }
    var completed = false;

    var api = {
      el: el,
      anim: anim, ui: ui,
      get motifs() { return IKS.motifs; },
      get reducedMotion() { return rm(); },
      alive: function () { return v.alive; },
      goal: setGoal,
      round: function (i, total, title, goal) {
        var gd = IKS.howto && IKS.howto.data && IKS.howto.data[id];
        setGoal(goal != null ? goal : (gd && gd.goals && gd.goals[i - 1]) || null);
        roundBox.hidden = false;
        diyaWrap.textContent = '';
        for (var k = 1; k <= total; k++) {
          var d = ui.diya({ lit: k < i, size: 22, flicker: k === i });
          if (k === i) d.classList.add('is-current');
          diyaWrap.appendChild(d);
        }
        /* a title that starts with "Finale" is the closing beat: shown as a finale, no repeated round number (the diyas still count it) */
        roundLabel.textContent = (title && /^finale\b/i.test(title)) ? title : 'Round ' + i + ' of ' + total + (title ? ' · ' + title : '');
        ui.say(roundLabel.textContent);
      },
      correct: function (node, msg) {
        anim.pulse(node || body);
        ui.say(msg || 'Correct.');
      },
      wrong: function (node, msg) {
        anim.shake(node || body);
        ui.say(msg || 'Not quite.');
      },
      say: ui.say,
      toast: ui.toast,
      sourceBox: function (list) {
        sourceUsed = true;
        if (autoSources.firstChild) autoSources.textContent = '';
        return mkSources(list);
      },
      explain: ui.explain,
      sleep: function (ms) {
        return new Promise(function (res) {
          if (rm()) { res(); return; }
          var t = setTimeout(function () { if (v.alive) res(); }, ms);
          v.timers.push(t);
        });
      },
      onExit: function (fn) { if (typeof fn === 'function') v.exits.push(fn); },
      complete: function (o) {
        if (completed) return Promise.resolve();
        completed = true;
        var stars = Math.max(1, Math.min(3, (o && o.stars) | 0 || 1));
        IKS.setStars(id, stars);
        var nc = nextChapterId(id);
        IKS.store.set('chapter', nc || (chap && chap.ch.id) || null);
        updateProgress();
        // all round diyas lit
        Array.prototype.forEach.call(diyaWrap.children, function (d) { d.classList.add('is-lit'); d.classList.remove('is-current'); });
        return celebrate(v, m, stars, nc, chap);
      }
    };

    // foot actions (shown after completion)
    function buildFoot(nc, chap_) {
      foot.textContent = '';
      var nxt = nextPlayable(id);
      foot.appendChild(el('a', { class: 'btn btn-primary', href: nc ? '#/s/' + nc : '#/' }, 'Continue the story →'));
      if (chap_) foot.appendChild(el('a', { class: 'btn btn-ghost', href: '#/s/' + chap_.ch.id }, 'Back to this chapter'));
      if (nxt) foot.appendChild(el('a', { class: 'btn btn-ghost', href: '#/level/' + nxt.id }, 'Next game: ' + nxt.title));
      foot.hidden = false;
      anim.fadeUp(foot);
    }
    v.buildFoot = buildFoot;

    if (!def) {
      body.appendChild(el('div', { class: 'callout info building' },
        el('h2', null, m.playable ? 'This game is still being built.' : 'This one is coming soon.'),
        el('p', null, m.playable ? 'We are finishing it. The story still works without it.' : 'It is planned, but not playable yet. The story explains the idea in the chapter.'),
        el('a', { class: 'btn btn-primary', href: backHref }, 'Back to the story')));
    } else {
      try {
        var ret = def.mount(body, api);
        if (typeof ret === 'function') v.exits.push(ret);
      } catch (e) {
        if (G.console) console.error(e);
        body.appendChild(el('div', { class: 'callout bad' }, el('h2', null, 'Something broke in this game.'), el('p', null, String(e && e.message || e)),
          el('a', { class: 'btn btn-primary', href: backHref }, 'Back to the story')));
      }
      // safety net: sources
      setTimeout(function () {
        if (!sourceUsed && v.alive && !frame.querySelector('.palm-box') && ((def && def.sources) || []).length) autoSources.appendChild(mkSources());
      }, 0);
    }
    if (hw) {
      var onFirst = function () { if (hw.isOpen()) hw.collapseQuiet(); };
      body.addEventListener('click', onFirst, true);
      body.addEventListener('input', onFirst, true);
      v.exits.push(function () { body.removeEventListener('click', onFirst, true); body.removeEventListener('input', onFirst, true); });
    }
    h1.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------ celebration */
  function celebrate(v, m, stars, nc, chap) {
    var existing = document.querySelector('.celebrate');
    if (existing) existing.parentNode.removeChild(existing);
    var lotus = IKS.motifs && IKS.motifs.lotus ? IKS.motifs.lotus({ size: 150 }) : null;
    var kolam = anim.drawKolam(el('svg', { class: 'celebrate-kolam' }), { loop: false });
    var diyaRow = el('div', { class: 'celebrate-diyas' });
    var diyas = [0, 1, 2].map(function () { var d = ui.diya({ lit: false, size: 46 }); diyaRow.appendChild(d); return d; });
    var lines = ['You got through it.', 'Nicely done.', 'Clean run.'];
    var nxt = nextPlayable(m.id);
    var closeBtn = el('button', { type: 'button', class: 'btn btn-ghost on-dark' }, 'Keep looking');
    var cont = el('a', { class: 'btn btn-gold', href: nc ? '#/s/' + nc : '#/' }, 'Continue the story →');
    var actions = el('div', { class: 'celebrate-actions' }, cont,
      chap ? el('a', { class: 'btn btn-ghost on-dark', href: '#/s/' + chap.ch.id }, 'Back to this chapter') : null,
      nxt ? el('a', { class: 'btn btn-ghost on-dark', href: '#/level/' + nxt.id }, 'Next game') : null, closeBtn);
    var card = el('div', { class: 'celebrate-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'cel-title' },
      el('div', { class: 'celebrate-art' }, kolam, el('div', { class: 'celebrate-lotus' }, lotus)),
      el('p', { class: 'celebrate-kicker' }, 'Game ' + (m.num || '') + ' complete'),
      el('h2', { id: 'cel-title', class: 'celebrate-title' }, m.title || 'Done'),
      el('p', { class: 'celebrate-line' }, lines[stars - 1]),
      diyaRow, actions);
    var overlay = el('div', { class: 'celebrate' }, card);
    document.body.appendChild(overlay);
    document.body.classList.add('has-overlay');
    var prevFocus = document.activeElement;
    function close() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.body.classList.remove('has-overlay');
      document.removeEventListener('keydown', onKey);
      if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
      if (v.buildFoot) v.buildFoot(nc, chap);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    v.exits.push(function () { document.removeEventListener('keydown', onKey); });
    cont.focus({ preventScroll: true });
    ui.say('Game complete. ' + stars + ' of 3 lamps lit.');
    if (v.buildFoot) v.buildFoot(nc, chap);

    if (rm()) {
      kolam.classList.add('is-drawn');
      if (lotus) lotus.classList.add('is-open');
      diyas.forEach(function (d, i) { if (i < stars) d.classList.add('is-lit'); });
      return Promise.resolve();
    }
    anim.fadeUp(card, { y: 24, duration: 520 });
    return (async function () {
      await sleepRaw(500); if (!v.alive) return;
      if (lotus) lotus.classList.add('is-open');
      for (var i = 0; i < stars; i++) {
        await sleepRaw(420); if (!v.alive) return;
        diyas[i].classList.add('is-lit', 'flicker');
        anim.pulse(diyas[i], 'rgba(242,162,12,.6)');
      }
      await sleepRaw(200); if (!v.alive) return;
      anim.petals(overlay, { x: overlay.clientWidth / 2, y: Math.min(overlay.clientHeight * 0.42, 320) });
      await sleepRaw(1400);
    })();
  }

  /* ----------------------------------------------------------- start */
  IKS.start = function () {
    if (S.started) return;
    S.started = true;
    app = document.getElementById('app');
    if (!app) { app = el('div', { id: 'app' }); document.body.appendChild(app); }
    ensureLive();
    topProgress = document.getElementById('progress');
    var bar = document.querySelector('.topbar');
    function onScroll() { if (bar) bar.classList.toggle('is-solid', G.scrollY > 40); }
    G.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    G.addEventListener('hashchange', route);
    route();
  };
})();
