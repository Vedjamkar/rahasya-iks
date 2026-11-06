/* Rahasya L3 "The Courtesan's Code" (id: cipher)
 * Mūladevīya: a reciprocal substitution (10 letter pairs swap, every other letter stays).
 * Pure logic first (testable in node), UI below. Classic script, works from file://.
 * Logic is exported on IKS.logic.cipher and module.exports.
 *
 * Tokens are IAST letters ('a', 'kh', 'ṅ', 'ā' ...). ASCII typing scheme (SPEC §6):
 * ṅ=G ñ=J ṭ=T ṇ=N ṣ=z ś=S ā=A ī=I ū=U; 'kh' and 'gh' are digraphs (longest match first).
 * Any other capital is simply lowercased.
 *
 * Gotcha: under this table a→k while h stays, so "ah" encrypts to tokens k,h. Joined as "kh" and
 * read again it would become the digraph kh (→ g). So: encrypt() writes a middle dot between such a
 * k/g and h, and tokenize() ignores the dot. The UI also keeps one tile per token. */
(function () {
  'use strict';
  var G = typeof window !== 'undefined' ? window : globalThis;
  var IKS = G.IKS = G.IKS || {};
  IKS.logic = IKS.logic || {};

  function N(s) { return s.normalize ? s.normalize('NFC') : s; }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  /* ---------------------------------------------------------------- data */
  var PAIRS = [['a', 'k'], ['kh', 'g'], ['gh', 'ṅ'], ['c', 'ṭ'], ['t', 'p'], ['ñ', 'ṇ'], ['n', 'm'], ['r', 'ṣ'], ['l', 's'], ['y', 'ś']]
    .map(function (p) { return [N(p[0]), N(p[1])]; });

  /* the rival's table (round 3): same 20 letters, different pairing, shares no pair with PAIRS */
  var VARIANT_PAIRS = [['a', 't'], ['k', 'r'], ['n', 's'], ['m', 'l'], ['y', 'c'], ['g', 'p'], ['kh', 'ś'], ['gh', 'ṣ'], ['ñ', 'ṭ'], ['ṅ', 'ṇ']]
    .map(function (p) { return [N(p[0]), N(p[1])]; });
  var VARIANT_KNOWN = VARIANT_PAIRS.slice(4);   // the six pairs that survive the tear
  var VARIANT_TORN = VARIANT_PAIRS.slice(0, 4); // the four that are lost

  var ASCII_TO_IAST = { G: 'ṅ', J: 'ñ', T: 'ṭ', N: 'ṇ', z: 'ṣ', S: 'ś', A: 'ā', I: 'ī', U: 'ū' };
  var IAST_TO_ASCII = {};
  Object.keys(ASCII_TO_IAST).forEach(function (k) { ASCII_TO_IAST[k] = N(ASCII_TO_IAST[k]); IAST_TO_ASCII[ASCII_TO_IAST[k]] = k; });
  var SEP = '·';

  function makeTable(pairs) {
    var t = {};
    pairs.forEach(function (p) { t[p[0]] = p[1]; t[p[1]] = p[0]; });
    return t;
  }
  var TABLE = makeTable(PAIRS);

  /* 20 positions around the wheel: pair k sits at positions 2k and 2k+9, so every gold arc spans
     nine steps and the ten arcs wrap a small empty circle at the hub. Used for both tables. */
  var LAYOUT = (function () {
    var arr = new Array(20);
    PAIRS.forEach(function (p, k) { arr[2 * k] = p[0]; arr[(2 * k + 9) % 20] = p[1]; });
    return arr;
  })();
  var LETTERS = LAYOUT.slice();

  /* -------------------------------------------------------------- tokens */
  function tokenize(s) {
    s = N(String(s == null ? '' : s));
    var out = [], i = 0, ch, two;
    while (i < s.length) {
      ch = s.charAt(i);
      if (ch === SEP) { i++; continue; }
      two = s.substr(i, 2);
      if (two === 'kh' || two === 'gh' || two === 'Kh') { out.push(two.toLowerCase()); i += 2; continue; }
      if (has(ASCII_TO_IAST, ch)) { out.push(ASCII_TO_IAST[ch]); i++; continue; }
      if (/[A-Z]/.test(ch)) { out.push(ch.toLowerCase()); i++; continue; }
      out.push(ch); i++;
    }
    return out;
  }
  function needsSep(tokens, i) {
    return (tokens[i] === 'k' || tokens[i] === 'g') && tokens[i + 1] === 'h';
  }
  function join(tokens, map) {
    var s = '';
    for (var i = 0; i < tokens.length; i++) {
      s += map && has(map, tokens[i]) ? map[tokens[i]] : tokens[i];
      if (needsSep(tokens, i)) s += SEP;
    }
    return s;
  }
  function toIAST(tokens) { return join(tokens, null); }
  function toASCII(tokens) { return join(tokens, IAST_TO_ASCII); }
  function swap(tokens, table) {
    table = table || TABLE;
    return tokens.map(function (t) { return has(table, t) ? table[t] : t; });
  }
  function encrypt(hk, table) { return toASCII(swap(tokenize(hk), table)); }
  function encryptIAST(hk, table) { return toIAST(swap(tokenize(hk), table)); }
  function canon(hk) { return toASCII(tokenize(hk)); }
  function isReciprocal(table) {
    return Object.keys(table).every(function (k) { return table[k] !== k && has(table, table[k]) && table[table[k]] === k; });
  }
  function variantTable() { return makeTable(VARIANT_PAIRS); }

  /* ------------------------------------------------------------- deduce */
  /* All complete tables that (a) contain every pair in `partial`, (b) agree with every crib
     {plain, cipher} (ASCII strings), and (c) pair up all 20 letters, each in exactly one pair.
     Returns an array of tables. A well-posed puzzle returns exactly one. */
  function deduce(cribs, partial, universe) {
    universe = universe || LETTERS;
    var inU = {}; universe.forEach(function (l) { inU[l] = true; });
    var pair = {};
    function link(a, b) {
      if (a === b || !inU[a] || !inU[b]) return false;
      if (has(pair, a) && pair[a] !== b) return false;
      if (has(pair, b) && pair[b] !== a) return false;
      pair[a] = b; pair[b] = a; return true;
    }
    var k;
    for (k in (partial || {})) if (has(partial, k) && !link(k, partial[k])) return [];
    for (var c = 0; c < (cribs || []).length; c++) {
      var pt = tokenize(cribs[c].plain), ct = tokenize(cribs[c].cipher);
      if (pt.length !== ct.length) return [];
      for (var i = 0; i < pt.length; i++) {
        if (pt[i] === ct[i]) { if (inU[pt[i]]) return []; continue; }
        if (!link(pt[i], ct[i])) return [];
      }
    }
    var loose = universe.filter(function (l) { return !has(pair, l); });
    var results = [];
    (function rec(rest, cur) {
      if (!rest.length) { results.push(cur); return; }
      var a = rest[0];
      for (var j = 1; j < rest.length; j++) {
        var b = rest[j], next = {};
        for (var kk in cur) if (has(cur, kk)) next[kk] = cur[kk];
        next[a] = b; next[b] = a;
        rec(rest.filter(function (_, idx) { return idx !== 0 && idx !== j; }), next);
      }
    })(loose, (function () { var t = {}; for (var kk in pair) if (has(pair, kk)) t[kk] = pair[kk]; return t; })());
    return results;
  }

  /* ---------------------------------------------------- puzzle content */
  /* Ciphertext is always computed, never typed. */
  var NOTES = [
    { plain: 'senA nagare', gloss: 'The army is in the city.', note: 'Only the ten pairs move. Every other letter stays.' },
    { plain: 'dvAram udghATaya', gloss: 'Open the gate.', note: 'gh counts as one letter, and so does ṭ. Both are on the wheel.' },
    { plain: 'sakhA praviSati', gloss: 'The friend comes in.', note: 'kh is one letter too. It swaps with g, not with k.' }
  ];
  var CRIBS = [
    { plain: 'senApati', gloss: 'army commander', dir: 'plain-first' },
    { plain: 'rAjyezu', gloss: 'in the kingdoms', dir: 'cipher-first' }
  ];
  var FINAL = { plain: 'nagare kamalam dadAti', gloss: 'She gives a lotus in the city.' };

  function puzzle3() {
    var T = variantTable();
    return {
      table: T, pairs: VARIANT_PAIRS, known: VARIANT_KNOWN, torn: VARIANT_TORN,
      knownTable: makeTable(VARIANT_KNOWN),
      cribs: CRIBS.map(function (c) { return { plain: c.plain, cipher: encrypt(c.plain, T), gloss: c.gloss, dir: c.dir }; }),
      final: { plain: FINAL.plain, cipher: encrypt(FINAL.plain, T), gloss: FINAL.gloss }
    };
  }
  function notes() {
    return NOTES.map(function (n) { return { plain: n.plain, cipher: encrypt(n.plain, TABLE), gloss: n.gloss, note: n.note }; });
  }

  /* 3 stars, minus one per three wrong taps in rounds 2-3 (never below 1). */
  function stars(wrongs) { return Math.max(1, 3 - Math.floor(wrongs / 3)); }

  var logic = {
    PAIRS: PAIRS, TABLE: TABLE, VARIANT_PAIRS: VARIANT_PAIRS, VARIANT_KNOWN: VARIANT_KNOWN, VARIANT_TORN: VARIANT_TORN,
    LAYOUT: LAYOUT, LETTERS: LETTERS, SEP: SEP, ASCII_TO_IAST: ASCII_TO_IAST,
    makeTable: makeTable, tokenize: tokenize, toIAST: toIAST, toASCII: toASCII, swap: swap,
    encrypt: encrypt, decrypt: encrypt, encryptIAST: encryptIAST, canon: canon,
    isReciprocal: isReciprocal, variantTable: variantTable, deduce: deduce,
    puzzle3: puzzle3, notes: notes, stars: stars
  };
  IKS.logic.cipher = logic;
  if (typeof module !== 'undefined' && module.exports) module.exports = logic;

  if (typeof window === 'undefined' || !IKS.registerLevel) return;
  /* ======================================================================
     UI
     ====================================================================== */
  var SOURCES = [
    { text: 'Vatsyayana, *Kama Sutra* I.3: mlecchita vikalpa is art no. 44 of the 64 arts. The art is named; no method is given.', tier: 'P' },
    { text: 'Yashodhara, *Jayamaṅgalā* (10th–13th c. CE), via Kahn, *The Codebreakers* (1996) p.74 and Ganguly, *Fine Arts in Ancient India* (1979) pp.167–170: the Mūladevīya table. Read through secondary books, so the table is still to verify.', tier: 'P' },
    { text: '"Mlecchita vikalpa", Wikipedia (overview only)', tier: 'W', url: 'https://en.wikipedia.org/wiki/Mlecchita_vikalpa' }
  ];
  var KEY_ORDER = ['a', 'c', 'g', 'gh', 'k', 'kh', 'l', 'm', 'n', 'p', 'r', 's', 't', 'y', 'ñ', 'ṅ', 'ṇ', 'ṭ', 'ṣ', 'ś'].map(N);
  var CHIPS = [['ṅ', 'G'], ['ñ', 'J'], ['ṭ', 'T'], ['ṇ', 'N'], ['ṣ', 'z'], ['ś', 'S'], ['ā', 'A'], ['ī', 'I'], ['ū', 'U']];

  IKS.registerLevel({
    id: 'cipher', num: 3, title: "The Courtesan's Code", tagline: 'Swap letters with the Mūladevīya table',
    goal: 'Confidentiality', era: 'Jayamaṅgalā, 10th–13th c. CE', icon: '🪷', sources: SOURCES, mount: mount
  });

  function mount(root, api) {
    var el = api.el;
    var WA = typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
    var EASE = 'cubic-bezier(.2,.8,.2,1)';
    var S = { wrongs: 0, skip: false, board: null };
    var timers = [];
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function animate(node, kf, opt) {
      if (!WA || api.reducedMotion || !node) return Promise.resolve();
      try { return node.animate(kf, opt).finished.catch(function () {}); } catch (e) { return Promise.resolve(); }
    }
    function flipIn(node) {
      animate(node, [{ transform: 'rotateX(90deg)', opacity: 0 }, { transform: 'rotateX(0)', opacity: 1 }], { duration: 260, easing: EASE });
    }
    function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

    /* ---------------------------------------------------------------- wheel */
    var R_STUD = 162, R_END = 140;
    function polar(r, idx) { var a = (-90 + idx * 18) * Math.PI / 180; return { x: +(r * Math.cos(a)).toFixed(2), y: +(r * Math.sin(a)).toFixed(2) }; }
    function idxOf(l) { return LAYOUT.indexOf(l); }
    function pkey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }

    var wheel = (function () {
      var W = { studs: {}, arcs: {}, pairMap: {}, onStud: null };
      var svg = el('svg', { class: 'cx-wheel', viewBox: '-230 -230 460 460', role: 'img',
        'aria-label': 'Brass cipher wheel. Twenty letters sit around the rim, joined in pairs by gold arcs.' });
      svg.appendChild(el('defs', null,
        el('linearGradient', { id: 'cxBrass', x1: '0', y1: '0', x2: '1', y2: '1' },
          el('stop', { offset: '0%', 'stop-color': '#F6E7A4' }), el('stop', { offset: '45%', 'stop-color': '#C9A227' }), el('stop', { offset: '100%', 'stop-color': '#7A5C0E' })),
        el('radialGradient', { id: 'cxFace', cx: '50%', cy: '42%', r: '68%' },
          el('stop', { offset: '0%', 'stop-color': '#2C3190' }), el('stop', { offset: '100%', 'stop-color': '#12122B' })),
        el('radialGradient', { id: 'cxBand', cx: '50%', cy: '50%', r: '50%' },
          el('stop', { offset: '60%', 'stop-color': '#1B1D5E' }), el('stop', { offset: '100%', 'stop-color': '#10113A' }))));
      svg.appendChild(el('circle', { r: 227, class: 'cx-brass', fill: 'url(#cxBrass)' }));
      svg.appendChild(el('circle', { r: 220, class: 'cx-engr' }));
      var d = '';
      for (var i = 0; i < 120; i++) {
        var a = i * 3 * Math.PI / 180, r2 = i % 5 === 0 ? 215 : 211;
        d += 'M' + (205 * Math.sin(a)).toFixed(1) + ' ' + (-205 * Math.cos(a)).toFixed(1) + 'L' + (r2 * Math.sin(a)).toFixed(1) + ' ' + (-r2 * Math.cos(a)).toFixed(1);
      }
      svg.appendChild(el('path', { d: d, class: 'cx-ticks' }));
      svg.appendChild(el('circle', { r: 200, class: 'cx-engr' }));
      svg.appendChild(el('circle', { r: 197, class: 'cx-band', fill: 'url(#cxBand)' }));
      svg.appendChild(el('circle', { r: 128, class: 'cx-face', fill: 'url(#cxFace)' }));
      svg.appendChild(el('circle', { r: 104, class: 'cx-faint' }));
      svg.appendChild(el('circle', { r: 66, class: 'cx-faint' }));
      var gems = el('g', { class: 'cx-gems' });
      for (i = 0; i < 20; i++) {
        var p = polar(R_STUD, i + .5);
        gems.appendChild(el('path', { d: 'M0 -6 L4 0 L0 6 L-4 0Z', transform: 'translate(' + p.x + ' ' + p.y + ') rotate(' + (i * 18 + 9) + ')' }));
      }
      svg.appendChild(gems);
      var arcLayer = el('g', { class: 'cx-arcs' });
      var studLayer = el('g', { class: 'cx-studs' });
      svg.appendChild(arcLayer);
      LAYOUT.forEach(function (l, k) {
        var p = polar(R_STUD, k);
        var g = el('g', { class: 'cx-stud', 'data-letter': l, transform: 'translate(' + p.x + ' ' + p.y + ')' },
          el('circle', { r: 19.5, class: 'cx-stud-bg' }),
          el('circle', { r: 24, class: 'cx-stud-ring' }),
          el('text', { class: 'cx-stud-t' + (l.length > 1 ? ' is-two' : ''), 'text-anchor': 'middle', dy: '.35em' }, l));
        g.addEventListener('pointerenter', function () { W.hot([l]); });
        g.addEventListener('pointerleave', function () { W.cool(); });
        g.addEventListener('click', function () { if (W.onStud) W.onStud(l); });
        W.studs[l] = g; studLayer.appendChild(g);
      });
      svg.appendChild(studLayer);
      svg.appendChild(el('circle', { r: 24, class: 'cx-hub', fill: 'url(#cxBrass)' }));
      svg.appendChild(el('path', { class: 'cx-hub-star', d: 'M0 -17 L4 -4 L17 0 L4 4 L0 17 L-4 4 L-17 0 L-4 -4Z' }));
      svg.appendChild(el('circle', { r: 3.4, class: 'cx-hub-dot' }));
      var flyLayer = el('g', { class: 'cx-flylayer' });
      svg.appendChild(flyLayer);
      W.svg = svg;

      W.clearArcs = function () { clear(arcLayer); W.arcs = {}; W.pairMap = {}; W.cool(); };
      W.addPair = function (a, b, o) {
        o = o || {};
        var p1 = polar(R_END, idxOf(a)), p2 = polar(R_END, idxOf(b));
        var c = { x: (p1.x + p2.x) / 2 * .42, y: (p1.y + p2.y) / 2 * .42 };
        var path = el('path', { class: 'cx-arc' + (o.cls ? ' ' + o.cls : ''), d: 'M' + p1.x + ' ' + p1.y + 'Q' + c.x.toFixed(1) + ' ' + c.y.toFixed(1) + ' ' + p2.x + ' ' + p2.y, pathLength: 1 });
        arcLayer.appendChild(path);
        W.arcs[pkey(a, b)] = { path: path, c: c };
        W.pairMap[a] = b; W.pairMap[b] = a;
        if (o.draw) animate(path, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: o.ms || 800, delay: o.delay || 0, easing: EASE, fill: 'backwards' });
        return path;
      };
      W.setPairs = function (pairs, o) {
        W.clearArcs(); o = o || {};
        pairs.forEach(function (p, i) { W.addPair(p[0], p[1], { cls: o.cls, draw: o.draw, delay: i * 70 }); });
      };
      W.hot = function (letters) {
        W.cool();
        letters.forEach(function (l) { if (W.studs[l]) W.studs[l].classList.add('is-hot'); });
        if (letters.length === 1 && has(W.pairMap, letters[0])) {
          var q = W.pairMap[letters[0]];
          W.studs[q].classList.add('is-hot'); W.arcs[pkey(letters[0], q)].path.classList.add('is-hot');
        } else if (letters.length === 2 && W.arcs[pkey(letters[0], letters[1])]) {
          W.arcs[pkey(letters[0], letters[1])].path.classList.add('is-hot');
        }
      };
      W.cool = function () {
        Array.prototype.forEach.call(svg.querySelectorAll('.is-hot'), function (n) { n.classList.remove('is-hot'); });
      };
      W.flash = function (a, b, ms) {
        W.hot([a, b]);
        later(function () { W.cool(); }, ms || 700);
      };
      W.pin = function (l) {
        Array.prototype.forEach.call(svg.querySelectorAll('.is-pin'), function (n) { n.classList.remove('is-pin'); });
        if (l && W.studs[l]) W.studs[l].classList.add('is-pin');
      };
      W.mark = function (l, cls, on) { if (W.studs[l]) W.studs[l].classList.toggle(cls, !!on); };
      W.wrongLine = function (a, b) {
        var p1 = polar(R_END, idxOf(a)), p2 = polar(R_END, idxOf(b));
        var ln = el('path', { class: 'cx-arc is-wrong', d: 'M' + p1.x + ' ' + p1.y + 'L' + p2.x + ' ' + p2.y, pathLength: 1 });
        arcLayer.appendChild(ln);
        animate(ln, [{ strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: .5 }, { strokeDashoffset: -1, opacity: 0 }], { duration: 640, easing: 'ease-in-out' });
        later(function () { if (ln.parentNode) ln.parentNode.removeChild(ln); }, 680);
      };
      /* send one token through; resolves to the token that comes out */
      W.fly = function (tok) {
        var paired = has(W.pairMap, tok), out = paired ? W.pairMap[tok] : tok;
        if (api.reducedMotion || !WA || S.skip) { if (paired) W.flash(tok, out, 450); return Promise.resolve(out); }
        var g = el('g', { class: 'cx-fly' + (paired ? '' : ' is-still') }, el('circle', { r: 19, class: 'cx-fly-bg' }),
          el('text', { class: 'cx-fly-t', 'text-anchor': 'middle', dy: '.35em' }, tok));
        flyLayer.appendChild(g);
        var tx = g.lastChild, kf = [], run;
        if (paired) {
          var s0 = polar(R_STUD, idxOf(tok)), s1 = polar(R_STUD, idxOf(out)), p0 = polar(R_END, idxOf(tok)), p2 = polar(R_END, idxOf(out));
          var c = W.arcs[pkey(tok, out)].c, pts = [s0], u, e, m;
          for (var i = 0; i <= 16; i++) {
            u = i / 16; e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; m = 1 - e;
            pts.push({ x: m * m * p0.x + 2 * m * e * c.x + e * e * p2.x, y: m * m * p0.y + 2 * m * e * c.y + e * e * p2.y });
          }
          pts.push(s1);
          pts.forEach(function (q, k) {
            kf.push({ transform: 'translate(' + q.x.toFixed(1) + 'px,' + q.y.toFixed(1) + 'px) scale(' + (k === 0 ? .5 : 1) + ')', opacity: k === 0 ? 0 : 1, offset: k / (pts.length - 1) });
          });
          W.hot([tok, out]);
          run = animate(g, kf, { duration: 640, easing: 'linear', fill: 'forwards' })
            .then(function () { return animate(tx, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], { duration: 110, fill: 'forwards' }); })
            .then(function () { tx.textContent = out; return animate(tx, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 110, fill: 'forwards' }); })
            .then(function () { return animate(g, [{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' }); });
        } else {
          kf = [{ transform: 'translate(0px,-80px) scale(.7)', opacity: 0 }, { transform: 'translate(0px,-40px) scale(1)', opacity: 1, offset: .25 },
            { transform: 'translate(0px,60px) scale(1)', opacity: .8, offset: .75 }, { transform: 'translate(0px,100px) scale(.7)', opacity: 0 }];
          run = animate(g, kf, { duration: 380, easing: 'ease-in-out', fill: 'forwards' });
        }
        return run.then(function () { if (g.parentNode) g.parentNode.removeChild(g); W.cool(); return out; });
      };
      return W;
    })();

    /* --------------------------------------------------------------- pieces */
    function tile(topTok, botTok, o) {
      o = o || {};
      var top = el('span', { class: 'cx-a' }, topTok);
      var bot = el(o.slot ? 'button' : 'span', { class: 'cx-b' + (o.slot ? ' is-slot' : '') });
      if (o.slot) { bot.type = 'button'; }
      if (botTok != null) bot.textContent = botTok;
      var t = el('div', { class: 'cx-t' }, top, bot);
      top.addEventListener('pointerenter', function () { wheel.hot([topTok]); });
      top.addEventListener('pointerleave', function () { wheel.cool(); });
      return { root: t, top: top, bot: bot };
    }
    /* a strip of tiles: top row given, bottom row filled as tokens come out */
    function makeStrip(tokens) {
      var root = el('div', { class: 'cx-tiles', role: 'group' }), parts = [], word = null;
      tokens.forEach(function (tk) {
        if (tk === ' ') { word = null; parts.push(null); return; }
        if (!word) { word = el('div', { class: 'cx-word' }); root.appendChild(word); }
        var t = tile(tk, '·'); t.bot.classList.add('is-wait'); word.appendChild(t.root); parts.push(t);
      });
      return {
        root: root,
        set: function (i, out) {
          var t = parts[i]; if (!t) return;
          t.bot.textContent = out; t.bot.classList.remove('is-wait');
          t.bot.classList.add(out !== tokens[i] ? 'is-changed' : 'is-same');
          flipIn(t.bot);
        }
      };
    }
    function button(label, action, cls, fn) {
      return el('button', { type: 'button', class: 'btn ' + (cls || 'btn-gold'), 'data-action': action, on: { click: fn } }, label);
    }
    function ph(txt, cls) { return el('p', { class: cls || 'cx-p' }, txt); }
    function deva(txt) { return el('span', { class: 'deva' }, txt); }

    function buildKeypad(onPick) {
      var wrap = el('div', { class: 'cx-keypad', role: 'group', 'aria-label': 'Letters on the wheel' });
      KEY_ORDER.forEach(function (l) {
        wrap.appendChild(el('button', { type: 'button', class: 'cx-key', 'data-letter': l, 'aria-label': 'Letter ' + l,
          on: { click: function () { onPick(l); }, pointerenter: function () { wheel.hot([l]); }, pointerleave: function () { wheel.cool(); }, focus: function () { wheel.hot([l]); }, blur: function () { wheel.cool(); } } }, l));
      });
      return wrap;
    }

    /* decode board: the player fills in what each moving letter was before the swap */
    function decodeBoard(spec) {
      var map = spec.map, ct = tokenize(spec.cipher), slots = [], cur = -1, pending = null, pendTimer = null;
      var root = el('div', { class: 'cx-tiles cx-board', role: 'group', 'aria-label': 'Decoding board' });
      var hint = el('p', { class: 'cx-hint', 'aria-live': 'off' });
      var word = null;
      ct.forEach(function (tk) {
        if (tk === ' ') { word = null; return; }
        if (!word) { word = el('div', { class: 'cx-word' }); root.appendChild(word); }
        var moves = has(map, tk);
        var t = tile(tk, moves ? '' : tk, { slot: moves });
        if (moves) {
          var s = { tok: tk, expect: map[tk], node: t.bot, done: false };
          t.bot.classList.add('is-empty');
          t.bot.setAttribute('aria-label', 'Letter ' + (slots.length + 1) + ' to decode, cipher letter ' + tk);
          t.bot.addEventListener('click', function () { if (!s.done) setActive(slots.indexOf(s)); });
          slots.push(s);
        } else t.bot.classList.add('is-same');
        word.appendChild(t.root);
      });
      function setActive(k) {
        cancelPending();
        slots.forEach(function (s) { s.node.classList.remove('is-active'); });
        cur = k;
        if (k < 0) { wheel.pin(null); return; }
        slots[k].node.classList.add('is-active'); wheel.pin(slots[k].tok);
      }
      function nextOpen(from) {
        for (var k = 1; k <= slots.length; k++) { var j = (from + k) % slots.length; if (!slots[j].done) return j; }
        return -1;
      }
      function cancelPending() {
        clearTimeout(pendTimer); pendTimer = null;
        if (pending && cur >= 0 && !slots[cur].done) slots[cur].node.textContent = '';
        pending = null;
      }
      function pick(tok) {
        if (cur < 0) return;
        var s = slots[cur];
        pending = null; clearTimeout(pendTimer);
        if (tok === s.expect) {
          s.done = true; s.node.textContent = tok; s.node.classList.remove('is-empty', 'is-active'); s.node.classList.add('is-done');
          flipIn(s.node); api.correct(s.node, 'Correct. ' + s.tok + ' was ' + tok + '.');
          wheel.flash(s.tok, tok, 800); hint.textContent = '';
          var n = nextOpen(cur);
          if (slots.every(function (x) { return x.done; })) {
            setActive(-1); S.board = null; root.classList.add('is-solved');
            if (spec.onSolved) spec.onSolved();
          } else setActive(n);
        } else {
          S.wrongs++; s.node.textContent = '';
          api.wrong(s.node, 'Not quite.');
          hint.textContent = 'Not ' + tok + '. Find ' + s.tok + ' on the wheel and follow its gold arc to the other end.';
        }
      }
      function typed(k) {
        if (cur < 0) return;
        var key = k;
        if (pending) {
          if (key === 'h') { var d = pending + 'h'; clearTimeout(pendTimer); pending = null; pick(d); return; }
          var pv = pending; clearTimeout(pendTimer); pending = null; pick(pv);
          if (cur < 0) return;
        }
        var tk = tokenize(key)[0];
        if (KEY_ORDER.indexOf(tk) < 0 && tk !== 'k' && tk !== 'g') return;
        if (tk === 'k' || tk === 'g') {
          pending = tk; slots[cur].node.textContent = tk + '…';
          pendTimer = setTimeout(function () { var q = pending; pending = null; if (q) pick(q); }, 650);
          timers.push(pendTimer);
          return;
        }
        pick(tk);
      }
      var board = { root: root, hint: hint, pick: pick, typed: typed, start: function () { setActive(nextOpen(-1) < 0 ? -1 : nextOpen(-1)); }, slots: slots };
      return board;
    }
    function onKey(e) {
      if (!S.board || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      S.board.typed(e.key);
    }
    document.addEventListener('keydown', onKey);
    api.onExit(function () { document.removeEventListener('keydown', onKey); timers.forEach(clearTimeout); });

    /* --------------------------------------------------------------- layout */
    var lotus = IKS.motifs && IKS.motifs.lotus ? IKS.motifs.lotus({ size: 84 }) : null;
    var caption = el('p', { class: 'cx-cap' });
    var badge = el('p', { class: 'cx-badge' }, el('span', { class: 'cx-badge-k' }, 'To verify'), 'Table to verify against Kahn p.74 / Ganguly pp.167–170');
    var arch = el('div', { class: 'cx-arch' },
      IKS.motifs && IKS.motifs.archFrame ? IKS.motifs.archFrame() : null,
      el('div', { class: 'cx-lotus', 'aria-hidden': 'true' }, lotus),
      el('div', { class: 'cx-wheelbox' }, wheel.svg), caption, badge);
    var panel = el('div', { class: 'cx-panel' });
    var stage = el('section', { class: 'cx-stage lvl-field-night', 'aria-label': 'Cipher wheel game' },
      el('span', { class: 'cx-deva', 'aria-hidden': 'true', lang: 'sa' }, 'गुप्त'),
      el('div', { class: 'cx-grid' }, arch, panel));
    root.appendChild(stage);
    root.appendChild(el('p', { class: 'cx-honest' },
      'What we know: the Kama Sutra only names this art (no. 44 of 64, mlecchita vikalpa). The table itself is described by Yashodhara in the Jayamaṅgalā, 10th to 13th century CE. We rebuilt it from Kahn and Ganguly and have not seen the original text, so check it against them.'));
    root.appendChild(api.explain('A table everyone must share', [
      ph('Both people need the same secret table. If the table is known, or someone steals it, every message is open. There is no key to change.'),
      ph('Round 3 shows how fast that can happen: two short texts we already knew were enough to rebuild a whole table. Next game, we break one with nothing but letter counts.')
    ]));
    root.appendChild(api.sourceBox(SOURCES));
    if (lotus) requestAnimationFrame(function () { later(function () { lotus.classList.add('is-open'); }, 200); });

    function setPanel(nodes) {
      clear(panel); panel.appendChild(el('div', { class: 'cx-panel-in' }, nodes));
      api.anim.fadeUp(panel.firstChild, { y: 12 });
    }
    function stepHead(kicker, title, text) {
      return [el('p', { class: 'cx-kicker' }, kicker), el('h2', { class: 'cx-h' }, title), text ? ph(text) : null];
    }
    function nextBtn(label, fn) {
      var b = button(label, 'next', 'btn-gold', function () { b.disabled = true; fn(); });
      return b;
    }

    /* ---------------------------------------------------------------- round 1 */
    function round1() {
      return new Promise(function (resolve) {
        api.round(1, 3, 'Learn the swap');
        caption.textContent = 'Mūladevīya table';
        badge.hidden = false;
        wheel.onStud = null;
        wheel.setPairs(PAIRS, { draw: true });
        var input = el('input', { class: 'cx-input', id: 'cx-name', type: 'text', maxlength: 14, autocomplete: 'off', spellcheck: 'false',
          autocapitalize: 'off', 'aria-describedby': 'cx-prev', placeholder: 'arjuna', 'data-action': 'name' });
        var preview = el('p', { class: 'cx-preview', id: 'cx-prev' });
        function upd() {
          var t = tokenize(input.value);
          preview.textContent = '';
          if (t.length) { preview.appendChild(document.createTextNode('We read: ')); preview.appendChild(deva(toIAST(t))); }
        }
        input.addEventListener('input', function () { upd(); reset(); });
        var chips = el('div', { class: 'cx-chips', role: 'group', 'aria-label': 'Special letters' });
        CHIPS.forEach(function (c) {
          chips.appendChild(el('button', { type: 'button', class: 'cx-chip', 'data-ins': c[1], 'aria-label': c[0] + ' (types ' + c[1] + ')', on: { click: function () {
            var s = input.selectionStart == null ? input.value.length : input.selectionStart, e = input.selectionEnd == null ? s : input.selectionEnd;
            input.value = input.value.slice(0, s) + c[1] + input.value.slice(e); input.focus();
            input.setSelectionRange(s + 1, s + 1); upd(); reset();
          } } }, el('span', { class: 'deva' }, c[0]), el('small', null, c[1])));
        });
        var samples = el('div', { class: 'cx-samples' }, el('span', null, 'Try'),
          ['arjuna', 'kAlidAsa', 'lakzmI'].map(function (s) {
            return el('button', { type: 'button', class: 'cx-sample', 'data-sample': s, on: { click: function () { input.value = s; upd(); reset(); } } }, toIAST(tokenize(s)));
          }));
        var out = el('div', { class: 'cx-out' });
        var msg = el('p', { class: 'cx-say', 'aria-live': 'polite' });
        var go = button('Send it through the wheel', 'encrypt', 'btn-gold', send);
        var skip = button('Skip animation', 'skip', 'btn-ghost on-dark btn-sm', function () { S.skip = true; });
        skip.hidden = true;
        var back = button('Now send it back', 'decrypt', 'btn-gold', unsend); back.hidden = true;
        var next = nextBtn('Round 2: an intercepted note →', function () { resolve(); }); next.hidden = true;
        var cipherTokens = null, busy = false, gen = 0;
        function reset() { if (busy) return; gen++; clear(out); msg.textContent = ''; back.hidden = true; next.hidden = true; go.disabled = false; cipherTokens = null; }
        async function run(tokens, strip) {
          busy = true; S.skip = false; skip.hidden = false; go.disabled = true; back.disabled = true;
          var res = [];
          for (var i = 0; i < tokens.length; i++) {
            if (tokens[i] === ' ') { res.push(' '); continue; }
            var o = await wheel.fly(tokens[i]);
            if (!api.alive()) return null;
            strip.set(i, o); res.push(o);
          }
          busy = false; skip.hidden = true; S.skip = false;
          return res;
        }
        async function send() {
          var tokens = tokenize(input.value.trim());
          if (!tokens.length) { msg.textContent = 'Type a name first.'; input.focus(); return; }
          if (!tokens.some(function (t) { return has(TABLE, t); })) {
            msg.textContent = 'None of these letters are on the wheel, so nothing swaps. Add an a, n, m, r, l, y, k, g, t, p, s or c.'; return;
          }
          clear(out); msg.textContent = ''; back.hidden = true; next.hidden = true;
          var strip = makeStrip(tokens); out.appendChild(el('p', { class: 'cx-rowlabel' }, 'Your name, then what comes out')); out.appendChild(strip.root);
          var my = gen;
          cipherTokens = await run(tokens, strip);
          if (!cipherTokens || my !== gen) return;
          go.disabled = false;
          msg.textContent = 'Scrambled. Each moving letter flew along its gold arc to its partner. Now send the scrambled letters through the same wheel.';
          back.hidden = false; back.disabled = false;
        }
        async function unsend() {
          if (!cipherTokens || busy) return;
          back.hidden = true;
          var strip = makeStrip(cipherTokens);
          out.appendChild(el('p', { class: 'cx-rowlabel' }, 'Through the same wheel again')); out.appendChild(strip.root);
          var back_ = await run(cipherTokens, strip);
          if (!back_) return;
          go.disabled = false;
          var same = back_.join('') === tokenize(input.value.trim()).join('');
          if (same) {
            api.correct(strip.root, 'Your name is back.');
            msg.textContent = 'Your name is back. Same wheel, same swap: each pair works both ways, so one table locks and unlocks.';
            next.hidden = false; next.focus();
          } else msg.textContent = 'The name changed while we ran it. Send it again.';
        }
        setPanel([
          stepHead('Round 1 · Learn the swap', 'Write your name in Mūladevīya', 'Ten pairs of letters trade places. All other letters stay. Type in small letters; capital A, I, U make ā, ī, ū, and the chips add the rest.'),
          el('label', { class: 'cx-label', for: 'cx-name' }, 'Your name'),
          el('div', { class: 'cx-inputrow' }, input, go),
          chips, samples, preview,
          el('div', { class: 'cx-actions' }, skip),
          out, msg, el('div', { class: 'cx-actions' }, back, next)
        ]);
        upd();
      });
    }

    /* ---------------------------------------------------------------- round 2 */
    function round2() {
      return new Promise(function (resolve) {
        api.round(2, 3, 'Intercepted note');
        caption.textContent = 'Mūladevīya table';
        badge.hidden = false;
        wheel.onStud = null;
        wheel.setPairs(PAIRS, { draw: false, cls: 'is-dim' });
        var list = notes(), idx = 0;
        function show() {
          var n = list[idx];
          var gloss = el('div', { class: 'cx-gloss', hidden: true });
          var keypad = buildKeypad(function (l) { if (S.board) S.board.pick(l); });
          var board = decodeBoard({ cipher: n.cipher, map: TABLE, onSolved: function () {
            keypad.classList.add('is-off');
            gloss.hidden = false;
            gloss.appendChild(el('p', { class: 'cx-gloss-k' }, 'It says'));
            gloss.appendChild(el('p', { class: 'cx-gloss-t deva' }, toIAST(tokenize(n.plain))));
            gloss.appendChild(el('p', { class: 'cx-gloss-e' }, n.gloss + ' ' + n.note));
            animate(gloss, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: EASE });
            var b = nextBtn(idx < list.length - 1 ? 'Next note →' : 'Round 3: the torn table →', function () {
              if (idx < list.length - 1) { idx++; show(); } else resolve();
            });
            gloss.appendChild(b); b.focus();
          } });
          S.board = board;
          setPanel([
            stepHead('Round 2 · Note ' + (idx + 1) + ' of ' + list.length, 'An intercepted note',
              idx === 0 ? 'A spy’s note is in cipher. For each letter that moves, tap the letter it was before the swap. Find it on the wheel and follow the gold arc. Letters that never move are already filled in.' : 'Same table. Decode the next note.'),
            el('div', { class: 'cx-leaf' }, board.root), board.hint, keypad,
            ph('You can also type the letters. Type k then h for kh, g then h for gh.', 'cx-small'), gloss
          ]);
          board.start();
        }
        show();
      });
    }

    /* ---------------------------------------------------------------- round 3 */
    function round3() {
      return new Promise(function (resolve) {
        api.round(3, 3, 'The torn table');
        var P = puzzle3(), R = P.table;
        S.board = null;
        caption.textContent = 'A rival’s wheel (made up by us for this puzzle)';
        badge.hidden = true;
        wheel.setPairs(P.known, { draw: true, cls: 'is-known' });
        var loose = LETTERS.filter(function (l) { return !has(P.knownTable, l); });
        var looseSet = {}; loose.forEach(function (l) { looseSet[l] = 1; });
        loose.forEach(function (l) { wheel.mark(l, 'is-loose', true); });
        var clue = {};
        P.cribs.forEach(function (c) { var a = tokenize(c.plain), b = tokenize(c.cipher); a.forEach(function (x, i) { if (x !== b[i]) { clue[x] = 1; clue[b[i]] = 1; } }); });

        var found = 0, sel = null;
        var status = el('p', { class: 'cx-status', 'aria-live': 'polite' });
        var msg = el('p', { class: 'cx-say', 'aria-live': 'polite' });
        var pad = el('div', { class: 'cx-pad', role: 'group', 'aria-label': 'Letters without a partner' });
        var padBtns = {};
        loose.forEach(function (l) {
          var b = el('button', { type: 'button', class: 'cx-key is-loose', 'data-loose': l, 'aria-pressed': 'false', 'aria-label': 'Letter ' + l + ', unpaired',
            on: { click: function () { choose(l); }, pointerenter: function () { wheel.hot([l]); }, pointerleave: function () { wheel.cool(); } } }, l);
          padBtns[l] = b; pad.appendChild(b);
        });
        wheel.onStud = function (l) {
          if (!looseSet[l]) { msg.textContent = 'That pair survived the tear. Pick one of the glowing letters.'; return; }
          if (padBtns[l].disabled) return;
          choose(l);
        };
        function upd() { status.textContent = found + ' of 4 torn pairs found'; }
        function setSel(l) {
          if (sel) { padBtns[sel].setAttribute('aria-pressed', 'false'); padBtns[sel].classList.remove('is-sel'); wheel.mark(sel, 'is-sel', false); }
          sel = l;
          if (l) { padBtns[l].setAttribute('aria-pressed', 'true'); padBtns[l].classList.add('is-sel'); wheel.mark(l, 'is-sel', true); }
        }
        function choose(l) {
          if (padBtns[l].disabled) return;
          if (!sel) { setSel(l); msg.textContent = l + ' picked. Now pick its partner.'; return; }
          if (sel === l) { setSel(null); msg.textContent = ''; return; }
          attempt(sel, l);
        }
        function attempt(a, b) {
          if (R[a] === b) {
            setSel(null);
            wheel.addPair(a, b, { cls: 'is-found', draw: true, ms: 700 });
            [a, b].forEach(function (l) { padBtns[l].disabled = true; padBtns[l].classList.add('is-found'); wheel.mark(l, 'is-loose', false); wheel.mark(l, 'is-found', true); });
            found++; upd();
            api.correct(padBtns[a], a + ' and ' + b + ' are a pair.');
            msg.textContent = a + ' ↔ ' + b + ' fits.';
            if (found === 3) msg.textContent += ' Two letters have no partner yet. Each letter sits in exactly one pair, so they can only go together.';
            if (found === 4) finish();
          } else {
            S.wrongs++;
            setSel(null);
            wheel.wrongLine(a, b);
            api.wrong(padBtns[b], 'Not that pair.');
            if (!clue[a] || !clue[b]) msg.textContent = 'No. The cribs say nothing about ' + (!clue[a] ? a : b) + '. Find what the cribs explain first; what is left over must pair up with itself.';
            else msg.textContent = 'No, ' + a + ' is not paired with ' + b + '. Line the two rows of a crib up, column by column.';
          }
        }
        function cribCard(c, n) {
          var pt = tokenize(c.plain), ct = tokenize(c.cipher);
          var rows = c.dir === 'cipher-first' ? [['They sent', ct, 'c'], ['We know it says', pt, 'p']] : [['We know it says', pt, 'p'], ['They sent', ct, 'c']];
          var grid = el('div', { class: 'cx-crib-grid' });
          var cols = el('div', { class: 'cx-crib-cols' });
          pt.forEach(function (p, i) {
            var q = ct[i];
            if (p === ' ') { cols.appendChild(el('span', { class: 'cx-gap', 'aria-hidden': 'true' })); return; }
            var kind = p === q ? 'is-same' : (looseSet[p] || looseSet[q]) ? 'is-clue' : 'is-known';
            var col = el('div', { class: 'cx-col ' + kind, title: p === q ? 'This letter does not move' : null }, el('span', { class: 'cx-a' }, rows[0][1][i]), el('span', { class: 'cx-b' }, rows[1][1][i]));
            col.addEventListener('pointerenter', function () { if (p !== q) wheel.hot([p, q]); else wheel.hot([]); });
            col.addEventListener('pointerleave', function () { wheel.cool(); });
            cols.appendChild(col);
          });
          grid.appendChild(el('div', { class: 'cx-crib-rows' }, el('span', null, rows[0][0]), el('span', null, rows[1][0])));
          grid.appendChild(cols);
          return el('div', { class: 'cx-crib' }, el('p', { class: 'cx-crib-h' }, 'Crib ' + n + ' · ', el('span', { class: 'deva' }, toIAST(pt)), ', ' + c.gloss), grid);
        }
        function finish() {
          msg.textContent = 'The table is whole. Now read what they sent.';
          api.goal('Now read their last message: tap what each moving letter was before the swap.');
          pad.classList.add('is-off');
          var gloss = el('div', { class: 'cx-gloss', hidden: true });
          var keypad = buildKeypad(function (l) { if (S.board) S.board.pick(l); });
          var board = decodeBoard({ cipher: P.final.cipher, map: R, onSolved: function () {
            keypad.classList.add('is-off');
            gloss.hidden = false;
            gloss.appendChild(el('p', { class: 'cx-gloss-k' }, 'It says'));
            gloss.appendChild(el('p', { class: 'cx-gloss-t deva' }, toIAST(tokenize(P.final.plain))));
            gloss.appendChild(el('p', { class: 'cx-gloss-e' }, P.final.gloss + ' Two short known texts were enough to rebuild their whole table.'));
            animate(gloss, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: EASE });
            var b = button('Finish', 'finish', 'btn-gold', function () { b.disabled = true; resolve(); });
            gloss.appendChild(b); b.focus();
          } });
          S.board = board;
          var wrap = el('div', { class: 'cx-final' },
            el('p', { class: 'cx-kicker' }, 'Their last message'),
            el('div', { class: 'cx-leaf' }, board.root), board.hint, keypad, gloss);
          panel.firstChild.appendChild(wrap);
          animate(wrap, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: EASE });
          board.start();
          if (wrap.scrollIntoView) wrap.scrollIntoView({ behavior: api.reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
        }
        setPanel([
          stepHead('Round 3 · The torn table', 'A rival’s table, torn',
            'A rival ring uses its own table. It follows the same rules: 20 letters, 10 pairs, every letter in exactly one pair. The tear took 4 pairs and left 8 letters loose. We hold two cribs, texts where we know both the plain and the sent version.'),
          el('div', { class: 'cx-cribs' }, cribCard(P.cribs[0], 1), cribCard(P.cribs[1], 2)),
          ph('Gold columns are the clues. Rebuild the missing pairs: pick a loose letter, then its partner.', 'cx-small'),
          pad, status, msg
        ]);
        upd();
      });
    }

    /* ------------------------------------------------------------------ run */
    (async function main() {
      await round1(); if (!api.alive()) return;
      await round2(); if (!api.alive()) return;
      await round3(); if (!api.alive()) return;
      api.complete({ stars: stars(S.wrongs) });
    })();
    return function cleanup() { S.board = null; };
  }
})();
