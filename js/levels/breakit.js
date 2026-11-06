/* Rahasya L4 "Break It!" (id: breakit)
 * The attacker's desk: we give a message a NEW secret reciprocal pairing (13 swapped pairs over A-Z),
 * then break it by counting letters. Pure logic first (testable in node), UI below.
 * Classic script, works from file://. Logic exported on IKS.logic.breakit and module.exports. */
(function () {
  'use strict';
  var G = typeof window !== 'undefined' ? window : globalThis;
  var IKS = G.IKS = G.IKS || {};
  IKS.logic = IKS.logic || {};

  var ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  /* typical English letter frequencies, percent of letters */
  var ENGLISH_FREQ = { E: 12.70, T: 9.06, A: 8.17, O: 7.51, I: 6.97, N: 6.75, S: 6.33, H: 6.09, R: 5.99, D: 4.25, L: 4.03,
    C: 2.78, U: 2.76, M: 2.41, W: 2.36, F: 2.23, G: 2.02, Y: 1.97, P: 1.93, B: 1.49, V: 0.98, K: 0.77, J: 0.15, X: 0.15, Q: 0.10, Z: 0.07 };
  var ENGLISH_ORDER = ALPHA.split('').sort(function (a, b) { return ENGLISH_FREQ[b] - ENGLISH_FREQ[a] || (a < b ? -1 : 1); });

  /* The three rounds. Plaintext is plain ASCII (so nothing leaks through accents). The table for each
     round is generated from `seed`; the ciphertext is never hand-typed. */
  var ROUNDS = [
    { id: 'long', seed: 4107, title: 'The long message', kind: 'About 600 letters',
      plaintext: 'We chose the Muladeviya idea because the rule is so simple. Swap every letter with its partner and the message turns into nonsense. The same table locks and unlocks, so two spies need only one sheet. That sheet is the problem. Everyone who sends or reads a message must hold the same table, and it never changes. If one copy is lost, every message is open at once. There is a second weakness, and it is the one we test here. The table swaps letters, but it cannot change how often a letter is used. In English e is the most common, then t and a, and a swapped letter keeps its count wherever it goes. So we count the letters, line up the tallest bars with e and t, and the pattern of the language shows through. Counting gives us a start, and word shapes finish the job.',
      crib: null,
      lesson: 'The table hid the letters, not how often they appear. Counting was enough.' },
    { id: 'medium', seed: 9923, title: 'A shorter note', kind: 'About 250 letters',
      plaintext: 'Round two is shorter, so the counts are rougher. Use the small clues instead. Look for the word the, for double letters like ee and ll, and for short words such as a and I. A sender could change the table every day, but then both people must agree on every new table, and that is the same shared secret problem again.',
      crib: null,
      lesson: 'Less text, rougher counts. Word shapes and double letters fill the gap.' },
    { id: 'short', seed: 199, title: 'Short, with a crib', kind: 'About 90 letters + one known word',
      plaintext: 'Few letters give weak counts, but one known word still cracks the table. Here it is Jayamangala, the commentary we cite.',
      crib: 'JAYAMANGALA',
      lesson: 'Short messages resist counting, but one known word hands over a lot of the table.' }
  ];

  /* ---------------------------------------------------------- pure functions */
  function seededRandom(seed) { /* mulberry32 */
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* map A-Z -> partner (reciprocal; letters outside the chosen pairs map to themselves) */
  function randomReciprocal(seed, pairs) {
    pairs = pairs == null ? 13 : pairs;
    var rnd = seededRandom(seed), arr = ALPHA.split(''), i, j, t;
    for (i = arr.length - 1; i > 0; i--) { j = Math.floor(rnd() * (i + 1)); t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    var map = {};
    ALPHA.split('').forEach(function (c) { map[c] = c; });
    for (i = 0; i < pairs; i++) { map[arr[2 * i]] = arr[2 * i + 1]; map[arr[2 * i + 1]] = arr[2 * i]; }
    return map;
  }
  function pairList(map) {
    var out = [];
    ALPHA.split('').forEach(function (c) { if (map[c] && map[c] > c) out.push([c, map[c]]); });
    return out;
  }
  function toMap(table) {
    if (!Array.isArray(table)) return table;
    var m = {};
    table.forEach(function (p) { m[p[0].toUpperCase()] = p[1].toUpperCase(); m[p[1].toUpperCase()] = p[0].toUpperCase(); });
    return m;
  }
  function applyPairs(text, table) {
    var m = toMap(table);
    return String(text).replace(/[A-Za-z]/g, function (ch) {
      var up = ch.toUpperCase(), to = m[up] || up;
      return ch === up ? to : to.toLowerCase();
    });
  }
  function freq(text) {
    var out = {};
    ALPHA.split('').forEach(function (c) { out[c] = 0; });
    String(text).toUpperCase().replace(/[A-Z]/g, function (c) { out[c]++; return c; });
    return out;
  }
  function letterCount(text) { return (String(text).match(/[A-Za-z]/g) || []).length; }
  function doubleFactorial(n) {
    var r = 1n, k = BigInt(n);
    while (k > 1n) { r *= k; k -= 2n; }
    return r;
  }
  function formatBig(n) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  /* every 3 hints dim one diya; never below one */
  function starsFor(hints) { return Math.max(1, 3 - Math.floor(hints / 3)); }

  function roundData(i) {
    var r = ROUNDS[i], table = randomReciprocal(r.seed, 13);
    var cipher = applyPairs(r.plaintext, table).toUpperCase();
    return { index: i, id: r.id, title: r.title, kind: r.kind, seed: r.seed, plain: r.plaintext, crib: r.crib, lesson: r.lesson,
      table: table, cipher: cipher, counts: freq(cipher), letters: letterCount(r.plaintext) };
  }

  /* cipher letters ranked by count (ties alphabetical) */
  function rankCipher(cipher) {
    var f = freq(cipher);
    return ALPHA.split('').sort(function (a, b) { return f[b] - f[a] || (a < b ? -1 : 1); });
  }
  /* guidance for round 1: the two tallest bars are probably E and T */
  function suggestGuide(cipher) {
    var r = rankCipher(cipher);
    return [[r[0], 'E'], [r[1], 'T']];
  }

  /* word shape: "JAYA" -> "0.1.0.1" style signature */
  function shapeOf(word) {
    var seen = {}, n = 0;
    return String(word).toUpperCase().split('').map(function (c) { if (!(c in seen)) seen[c] = n++; return seen[c]; }).join('.');
  }
  /* pairs [c,p] implied by laying `crib` over cipher word, or null when impossible for a reciprocal table */
  function cribPairs(cipherWord, crib) {
    cipherWord = cipherWord.toUpperCase(); crib = crib.toUpperCase();
    if (cipherWord.length !== crib.length) return null;
    var m = {}, i, c, p;
    for (i = 0; i < crib.length; i++) {
      c = cipherWord[i]; p = crib[i];
      if (c === p) return null;
      if (m[c] && m[c] !== p) return null;
      if (m[p] && m[p] !== c) return null;
      m[c] = p; m[p] = c;
    }
    var out = [], seen = {};
    for (i = 0; i < crib.length; i++) {
      c = cipherWord[i]; p = crib[i];
      if (!seen[c] && !seen[p]) { seen[c] = seen[p] = 1; out.push([c, p]); }
    }
    return out;
  }
  /* every word of the ciphertext where the crib could sit */
  function cribMatches(cipher, crib) {
    var out = [], re = /[A-Z]+/g, m;
    while ((m = re.exec(cipher))) {
      if (m[0].length === crib.length && shapeOf(m[0]) === shapeOf(crib) && cribPairs(m[0], crib)) out.push({ start: m.index, end: m.index + m[0].length, word: m[0] });
    }
    return out;
  }
  /* letters (A-Z) that are determined once these pairs are known */
  function coveredLetters(table, cipherLetters) {
    var s = {};
    cipherLetters.forEach(function (c) { s[c] = 1; s[table[c]] = 1; });
    return s;
  }

  /* --------------------------------------------------------------- the desk */
  /* Pure state machine: pairs, conflicts, undo, locked hint pairs, win check. */
  var HINT_WORDS = ['THE', 'AND', 'THAT', 'WITH', 'IS', 'TO', 'OF', 'IT'];
  function createDesk(rd) {
    var g = {}, locked = {}, stack = [], hints = 0;
    var cipherLetters = {};
    rd.cipher.replace(/[A-Z]/g, function (c) { cipherLetters[c] = 1; return c; });

    function put(a, b) { g[a] = b; g[b] = a; }
    function drop(a) { var b = g[a]; delete g[a]; if (b) delete g[b]; }
    function check(a, b) {
      if (a === b) return { ok: false, reason: 'self', letters: [a] };
      var bad = [];
      if (g[a]) bad.push(a);
      if (g[b]) bad.push(b);
      if (bad.length) return { ok: false, reason: 'taken', letters: bad, with: bad.map(function (x) { return g[x]; }) };
      return { ok: true };
    }
    function canAll(prs) {
      var seen = {}, i, a, b, r;
      for (i = 0; i < prs.length; i++) {
        a = prs[i][0]; b = prs[i][1];
        if (g[a] === b && g[b] === a) continue; // already set
        r = check(a, b);
        if (!r.ok) return r;
        if (seen[a] || seen[b]) return { ok: false, reason: 'taken', letters: [a], with: [] };
        seen[a] = seen[b] = 1;
      }
      return { ok: true };
    }
    function revealTrue(c) { /* hint: make c <-> table[c] true, clearing any wrong pairs in the way */
      var p = rd.table[c], cleared = [];
      [c, p].forEach(function (x) {
        if (g[x] && g[x] !== (x === c ? p : c)) { cleared.push([x, g[x]]); drop(x); }
      });
      put(c, p); locked[c] = locked[p] = 1;
      return { pair: [c, p], cleared: cleared };
    }
    function wrongAt(c) { return g[c] !== rd.table[c]; }

    var desk = {
      round: rd,
      partner: function (c) { return g[c] || null; },
      isLocked: function (c) { return !!locked[c]; },
      pairs: function () { var o = []; Object.keys(g).forEach(function (a) { if (a < g[a]) o.push([a, g[a]]); }); return o; },
      pairCount: function () { return Object.keys(g).length / 2; },
      hints: function () { return hints; },
      check: check,
      pair: function (a, b) {
        a = String(a).toUpperCase(); b = String(b).toUpperCase();
        var r = check(a, b);
        if (!r.ok) return r;
        put(a, b); stack.push([['add', a, b]]);
        return { ok: true, letters: [a, b] };
      },
      pairMany: function (prs) {
        var r = canAll(prs);
        if (!r.ok) return r;
        var ops = [];
        prs.forEach(function (p) { if (!(g[p[0]] === p[1])) { put(p[0], p[1]); ops.push(['add', p[0], p[1]]); } });
        if (ops.length) stack.push(ops);
        return { ok: true, letters: prs.reduce(function (acc, p) { return acc.concat(p); }, []) };
      },
      unpair: function (a) {
        a = String(a).toUpperCase();
        if (!g[a]) return { ok: false, reason: 'none', letters: [a] };
        if (locked[a]) return { ok: false, reason: 'locked', letters: [a, g[a]] };
        var b = g[a]; drop(a); stack.push([['del', a, b]]);
        return { ok: true, letters: [a, b] };
      },
      clearAll: function () {
        var ops = [];
        desk.pairs().forEach(function (p) { if (!locked[p[0]]) { ops.push(['del', p[0], p[1]]); drop(p[0]); } });
        if (ops.length) stack.push(ops);
        return { ok: ops.length > 0, count: ops.length };
      },
      canUndo: function () { return stack.length > 0; },
      undo: function () {
        while (stack.length) {
          var ops = stack.pop(), touched = [], did = false, i, o;
          for (i = ops.length - 1; i >= 0; i--) {
            o = ops[i];
            if (o[0] === 'add') { if (g[o[1]] === o[2] && !locked[o[1]]) { drop(o[1]); touched.push(o[1], o[2]); did = true; } }
            else if (!g[o[1]] && !g[o[2]]) { put(o[1], o[2]); touched.push(o[1], o[2]); did = true; }
          }
          if (did) return { ok: true, letters: touched };
        }
        return { ok: false };
      },
      /* decoded char per cipher char: lowercase letter, or null when unknown */
      decodeChar: function (ch) { return g[ch] ? g[ch].toLowerCase() : null; },
      decoded: function () {
        return rd.cipher.replace(/[A-Z]/g, function (c) { return g[c] ? g[c].toLowerCase() : '·'; });
      },
      solved: function () {
        var c;
        for (c in cipherLetters) if (g[c] !== rd.table[c]) return false;
        return true;
      },
      correctCount: function () { var n = 0, c; for (c in cipherLetters) if (g[c] === rd.table[c]) n++; return n; },
      lettersInText: function () { return Object.keys(cipherLetters).sort(); },
      /* hints: 'common' | 'crib' | 'random' ; each reveals true pairs and costs 1/3 diya */
      hintAvailable: function (kind) { return !!desk._pickHint(kind); },
      _pickHint: function (kind) {
        var i, c, cand;
        if (kind === 'common') {
          var rk = rankCipher(rd.cipher);
          for (i = 0; i < rk.length; i++) { c = rk[i]; if (cipherLetters[c] && wrongAt(c)) return { letters: [c], label: 'the most common letter' }; }
          return null;
        }
        if (kind === 'crib') {
          var words = rd.cipher.match(/[A-Z]+/g) || [], plains = rd.plain.toUpperCase().match(/[A-Z]+/g) || [], w, k;
          for (k = 0; k < HINT_WORDS.length; k++) {
            w = HINT_WORDS[k];
            for (i = 0; i < plains.length; i++) {
              if (plains[i] !== w) continue;
              var cl = words[i].split('').filter(function (x, ix, a) { return a.indexOf(x) === ix; });
              if (cl.some(wrongAt)) return { letters: cl.filter(wrongAt), label: 'the word "' + w.toLowerCase() + '"', word: w };
            }
          }
          return null;
        }
        cand = Object.keys(cipherLetters).filter(wrongAt).sort();
        if (!cand.length) return null;
        var rnd = seededRandom(rd.seed * 31 + hints * 7 + 5);
        return { letters: [cand[Math.floor(rnd() * cand.length)]], label: 'one pair' };
      },
      hint: function (kind) {
        var h = desk._pickHint(kind);
        if (!h) return { ok: false };
        var out = [], cleared = [];
        h.letters.forEach(function (c) { if (g[c] !== rd.table[c]) { var r = revealTrue(c); out.push(r.pair); cleared = cleared.concat(r.cleared); } });
        hints++;
        return { ok: true, pairs: out, cleared: cleared, label: h.label, word: h.word };
      },
      fakeHints: function (n) { hints += n; } /* test helper */
    };
    return desk;
  }

  var logic = {
    ALPHA: ALPHA, ENGLISH_FREQ: ENGLISH_FREQ, ENGLISH_ORDER: ENGLISH_ORDER, ROUNDS: ROUNDS,
    seededRandom: seededRandom, randomReciprocal: randomReciprocal, pairList: pairList, applyPairs: applyPairs,
    freq: freq, letterCount: letterCount, doubleFactorial: doubleFactorial, formatBig: formatBig, starsFor: starsFor,
    roundData: roundData, rankCipher: rankCipher, suggestGuide: suggestGuide, shapeOf: shapeOf,
    cribPairs: cribPairs, cribMatches: cribMatches, coveredLetters: coveredLetters, createDesk: createDesk
  };
  IKS.logic.breakit = logic;
  if (typeof module !== 'undefined') module.exports = logic;

  if (typeof window === 'undefined') return;
  /* ======================================================================= UI */
  var SOURCES = [
    { n: 1, tier: 'P', text: 'Yashodhara, *Jayamaṅgalā* (10th–13th c. CE), via Kahn, *The Codebreakers* (1996) p.74 and Ganguly, *Fine Arts in Ancient India* (1979) pp.167–170 — the Mūladevīya table' },
    { n: 2, tier: 'B', text: 'Kahn (1996), *The Codebreakers* — history of frequency analysis' },
    { n: 3, tier: 'O', text: 'Our own test (research file, gap 3): a fixed table with no key falls to letter counting' }
  ];

  var totalHints = 0; /* across the whole level; every 3 dim one diya */

  function mount(root, api) {
    var el = api.el, L = logic;
    var alive = true, cur = null, roundIdx = 0;
    var exits = [];
    api.onExit(function () { alive = false; exits.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } }); });
    totalHints = 0;


    /* ------------------------------------------------ the field + intro */
    var arch = IKS.motifs && IKS.motifs.crackedArch ? IKS.motifs.crackedArch({}) : null;
    var stage = el('div', { class: 'bk-stage' });
    var field = el('div', { class: 'bk-field' },
      el('div', { class: 'bk-jaali', 'aria-hidden': 'true' }),
      el('div', { class: 'bk-deva deva', lang: 'sa', 'aria-hidden': 'true' }, 'भेद'),
      el('div', { class: 'bk-intro' },
        el('div', { class: 'bk-intro-copy' },
          el('p', { class: 'bk-kicker' }, 'The attacker’s desk'),
          el('h2', { class: 'bk-h' }, 'Spies would change the pairs. Can we still read it?'),
          el('p', { class: 'bk-lede' }, 'We gave each message a new secret Mūladevīya-style table: 13 swapped pairs over the English alphabet. We use English because letter counting is easiest to learn there. All we hold is the ciphertext. No table, no key.')),
        el('div', { class: 'bk-intro-art', 'aria-hidden': 'true' }, arch)),
      stage);
    root.appendChild(field);
    if (arch) {
      var archT = setTimeout(function () { arch.classList.add('is-in'); }, 250);
      exits.push(function () { clearTimeout(archT); });
    }

    /* ------------------------------------------------ one round */
    function buildRound(i) {
      var rd = L.roundData(i), desk = L.createDesk(rd);
      var sel = null, sorted = false, done = false, sortedOnce = false, scale = 1;
      var cells = {}, tiles = {}, bars = {};
      var disposers = [];
      var total = rd.letters;
      var guide = i === 0 ? L.suggestGuide(rd.cipher) : null;
      var matches = rd.crib ? L.cribMatches(rd.cipher, rd.crib) : [];

      api.round(i + 1, 3, rd.title);

      /* ---- coach */
      var coach = el('p', { class: 'bk-coach', role: 'status' });
      function setCoach(msg) { if (coach.textContent !== msg) { coach.textContent = msg; api.anim.fadeUp(coach, { y: 6, duration: 260 }); } }

      /* ---- cryptogram */
      var textBox = el('div', { class: 'bk-text', tabindex: '0', role: 'group', 'aria-label': 'Intercepted message, ' + total + ' letters. Each letter has its guess underneath.' });
      var srText = el('p', { class: 'sr-only' });
      var offset = 0;
      rd.cipher.split(/(\s+)/).forEach(function (tok) {
        if (!tok) return;
        if (/^\s+$/.test(tok)) { offset += tok.length; return; }
        var word = el('span', { class: 'bk-w' });
        var cand = matches.filter(function (m) { return m.start === offset; })[0];
        for (var k = 0; k < tok.length; k++) {
          var ch = tok[k];
          if (/[A-Z]/.test(ch)) {
            var p = el('span', { class: 'bk-p' }, '·');
            var cell = el('span', { class: 'bk-k', 'data-c': ch, 'aria-hidden': 'true' }, el('span', { class: 'bk-c' }, ch), p);
            (cells[ch] = cells[ch] || []).push({ k: cell, p: p, real: rd.plain.charAt(offset + k) });
            word.appendChild(cell);
          } else {
            word.appendChild(el('span', { class: 'bk-k bk-x', 'aria-hidden': 'true' }, el('span', { class: 'bk-c' }, ch), el('span', { class: 'bk-p' }, '')));
          }
        }
        if (cand) {
          word.classList.add('is-cand');
          word.appendChild(el('button', { type: 'button', class: 'bk-lay', 'data-start': String(cand.start), 'aria-label': 'Lay the crib ' + rd.crib + ' over this ' + tok.length + '-letter word' }, 'Lay crib here'));
        }
        textBox.appendChild(word);
        offset += tok.length;
      });
      var cribLine = rd.crib ? el('div', { class: 'bk-crib' },
        el('span', { class: 'bk-crib-label' }, 'We know it mentions'),
        el('span', { class: 'bk-crib-word' }, rd.crib),
        el('span', { class: 'bk-crib-shape' }, 'Its letters repeat in the pattern ' + L.shapeOf(rd.crib).split('.').map(function (n) { return +n + 1; }).join(' ') + '. Words with that shape are outlined in gold.')) : null;
      var textPanel = el('section', { class: 'bk-panel bk-panel-text', 'aria-label': 'Ciphertext' },
        el('header', { class: 'bk-ph' }, el('h3', null, 'The intercepted message'),
          el('span', { class: 'bk-tag' }, total + ' letters · ' + rd.kind.toLowerCase())),
        cribLine, textBox, srText);

      /* ---- frequency loom */
      var maxCount = 0, maxExp = L.ENGLISH_FREQ.E / 100 * total;
      L.ALPHA.split('').forEach(function (c) { if (rd.counts[c] > maxCount) maxCount = rd.counts[c]; });
      scale = Math.max(maxCount, maxExp) * 1.04;
      var rank = L.rankCipher(rd.cipher);
      var barsBox = el('div', { class: 'bk-bars', role: 'img', 'aria-label': 'Bar chart of how often each letter appears in the ciphertext. Most common: ' +
        rank.slice(0, 5).map(function (c) { return c + ' ' + rd.counts[c]; }).join(', ') + '.' });
      L.ALPHA.split('').forEach(function (c) {
        var b = el('div', { class: 'bk-bar', 'data-l': c, title: c + ': ' + rd.counts[c] },
          el('div', { class: 'bk-bar-area' },
            el('div', { class: 'bk-fill' }),
            el('div', { class: 'bk-ghost' })),
          el('div', { class: 'bk-bl' }, c),
          el('div', { class: 'bk-bn' }, String(rd.counts[c])),
          el('div', { class: 'bk-en' }),
          el('div', { class: 'bk-lk' }));
        bars[c] = { root: b, fill: b.querySelector('.bk-fill'), ghost: b.querySelector('.bk-ghost'), en: b.querySelector('.bk-en'), lk: b.querySelector('.bk-lk') };
        b.style.setProperty('--v', String(rd.counts[c] / scale));
        barsBox.appendChild(b);
      });
      var sortBtn = el('button', { type: 'button', class: 'bk-btn bk-btn-gold', 'aria-pressed': 'false' }, 'Sort by height');
      var loomPanel = el('section', { class: 'bk-panel bk-panel-loom', 'aria-label': 'Frequency loom' },
        el('header', { class: 'bk-ph' }, el('h3', null, 'Frequency loom'), sortBtn),
        el('div', { class: 'bk-legend', 'aria-hidden': 'true' },
          el('span', { class: 'bk-lg bk-lg-bar' }, 'letters in this message'),
          el('span', { class: 'bk-lg bk-lg-ghost' }, 'typical English'),
          el('span', { class: 'bk-lg bk-lg-note' }, 'Sorted, the gold marks show which English letter each rank looks like.')),
        barsBox);

      function ghostFor(letter, idx) {
        var eng = sorted ? L.ENGLISH_ORDER[idx] : letter;
        return { v: L.ENGLISH_FREQ[eng] / 100 * total / scale, eng: eng };
      }
      function layoutBars(animate) {
        var order = sorted ? rank.slice() : L.ALPHA.split('');
        var before = {};
        if (animate && !api.reducedMotion) order.forEach(function (c) { before[c] = bars[c].root.getBoundingClientRect().left; });
        order.forEach(function (c, idx) {
          var g = ghostFor(c, idx), b = bars[c];
          barsBox.appendChild(b.root);
          b.ghost.style.setProperty('--g', String(g.v));
          b.en.textContent = sorted ? g.eng : '';
        });
        barsBox.classList.toggle('is-sorted', sorted);
        if (animate && !api.reducedMotion && Element.prototype.animate) {
          order.forEach(function (c) {
            var dx = before[c] - bars[c].root.getBoundingClientRect().left;
            if (Math.abs(dx) > 1) bars[c].root.animate([{ transform: 'translateX(' + dx + 'px)' }, { transform: 'none' }], { duration: 620, easing: 'cubic-bezier(.6,0,.2,1)' });
          });
        }
      }
      sortBtn.addEventListener('click', function () {
        sorted = !sorted; sortedOnce = true;
        sortBtn.setAttribute('aria-pressed', String(sorted));
        sortBtn.textContent = sorted ? 'Back to A to Z' : 'Sort by height';
        layoutBars(true);
        api.say(sorted ? 'Bars sorted from tallest to shortest. English ranks shown underneath.' : 'Bars back in alphabet order.');
        refreshCoach();
      });

      /* ---- pairing board */
      var tilesBox = el('div', { class: 'bk-tiles' });
      var arcs = el('svg', { class: 'bk-arcs', 'aria-hidden': 'true', focusable: 'false' });
      L.ALPHA.split('').forEach(function (c) {
        var t = el('button', { type: 'button', class: 'bk-tile', 'data-l': c, 'aria-pressed': 'false' },
          el('span', { class: 'bk-tl' }, c), el('span', { class: 'bk-tp' }));
        tiles[c] = { root: t, tp: t.querySelector('.bk-tp') };
        tilesBox.appendChild(t);
      });
      var board = el('div', { class: 'bk-board' }, arcs, tilesBox);
      var statusEl = el('p', { class: 'bk-status', role: 'status' });
      var undoBtn = el('button', { type: 'button', class: 'bk-btn' }, 'Undo');
      var breakBtn = el('button', { type: 'button', class: 'bk-btn' }, 'Break link');
      var clearBtn = el('button', { type: 'button', class: 'bk-btn bk-btn-quiet' }, 'Clear all');
      var countEl = el('span', { class: 'bk-count' });
      var boardPanel = el('section', { class: 'bk-panel bk-panel-board', 'aria-label': 'Pairing board' },
        el('header', { class: 'bk-ph' }, el('h3', null, 'Pairing board'),
          el('span', { class: 'bk-tag' }, 'Click a letter, then its partner. Or type both.')),
        board,
        el('div', { class: 'bk-actions' }, statusEl, el('div', { class: 'bk-btnrow' }, countEl, undoBtn, breakBtn, clearBtn)));

      /* ---- hints */
      var meter = el('span', { class: 'bk-meter' });
      var hintBtns = {
        common: el('button', { type: 'button', class: 'bk-hint', 'data-k': 'common' }, el('b', null, 'Most common letter'), el('span', null, 'Reveals the pair of the tallest unsolved bar')),
        crib: el('button', { type: 'button', class: 'bk-hint', 'data-k': 'crib' }, el('b', null, 'Reveal a common word'), el('span', null, 'Pairs for “the” (or “and”) from the message')),
        random: el('button', { type: 'button', class: 'bk-hint', 'data-k': 'random' }, el('b', null, 'One random pair'), el('span', null, 'A single correct pair, picked for you'))
      };
      var toolsPanel = el('section', { class: 'bk-panel bk-panel-tools', 'aria-label': 'Hints' },
        el('header', { class: 'bk-ph' }, el('h3', null, 'Hints'), meter),
        el('div', { class: 'bk-hints' }, hintBtns.common, hintBtns.crib, hintBtns.random),
        el('p', { class: 'bk-fine' }, 'Each hint costs a third of a diya. Three hints dim one lamp, and you always keep at least one.'));

      var doneBox = el('div', { class: 'bk-done-slot' });
      var play = el('div', { class: 'bk-play' }, coach, textPanel, loomPanel, boardPanel, toolsPanel, doneBox);
      stage.textContent = '';
      stage.appendChild(play);
      api.anim.stagger([coach, textPanel, loomPanel, boardPanel, toolsPanel], { step: 70, y: 14, duration: 420 });
      layoutBars(false);

      /* bars grow */
      if (!api.reducedMotion && Element.prototype.animate) {
        L.ALPHA.split('').forEach(function (c, ix) {
          bars[c].fill.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(var(--v))' }], { duration: 700, delay: 250 + ix * 28, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
          bars[c].ghost.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 900 + ix * 20, fill: 'backwards' });
        });
      }

      /* ------------------------------------------------ rendering */
      function cellText(c) { var d = desk.decodeChar(c); return d == null ? '·' : d; }
      function refreshLetter(c, flip) {
        var d = desk.partner(c), list = cells[c] || [];
        list.forEach(function (o, ix) {
          var txt = d ? d.toLowerCase() : '·';
          o.k.classList.toggle('is-cracked', !!d);
          if (o.p.textContent === txt) return;
          if (flip && ix < 30 && !api.reducedMotion) api.anim.flipText(o.p, txt, 340); else o.p.textContent = txt;
        });
        var t = tiles[c], b = bars[c];
        t.root.classList.toggle('is-paired', !!d);
        t.root.classList.toggle('is-locked', desk.isLocked(c));
        t.tp.textContent = d ? '↔ ' + d : '';
        t.root.setAttribute('aria-label', 'Letter ' + c + (d ? ', paired with ' + d + (desk.isLocked(c) ? ', revealed by a hint' : '') : ', not paired') + (c === sel ? ', selected' : ''));
        b.root.classList.toggle('is-paired', !!d);
        b.lk.textContent = d ? '↔' + d : '';
      }
      function refreshSel() {
        L.ALPHA.split('').forEach(function (c) {
          var isSel = c === sel, isMate = !!sel && desk.partner(sel) === c;
          tiles[c].root.classList.toggle('is-sel', isSel);
          tiles[c].root.classList.toggle('is-mate', isMate);
          tiles[c].root.setAttribute('aria-pressed', String(isSel));
          bars[c].root.classList.toggle('is-sel', isSel);
          bars[c].root.classList.toggle('is-mate', isMate);
          (cells[c] || []).forEach(function (o) { o.k.classList.toggle('is-sel', isSel); o.k.classList.toggle('is-mate', isMate); });
        });
        var s = sel, d = s && desk.partner(s);
        if (!s) statusEl.textContent = 'Pick a letter to start a pair.';
        else if (d) statusEl.textContent = s + ' is paired with ' + d + (desk.isLocked(s) ? ' (revealed by a hint).' : '. Backspace breaks the link.');
        else statusEl.textContent = s + ' selected. Pick or type the letter it stands for.';
        breakBtn.disabled = !(s && d && !desk.isLocked(s));
      }
      function refreshMeta() {
        undoBtn.disabled = !desk.canUndo() || done;
        clearBtn.disabled = done || !desk.pairs().some(function (p) { return !desk.isLocked(p[0]); });
        countEl.textContent = desk.pairCount() + ' of 13 pairs set';
        Object.keys(hintBtns).forEach(function (k) { hintBtns[k].disabled = done || !desk.hintAvailable(k); });
        meter.textContent = '';
        meter.appendChild(IKS.ui.diyas(3, L.starsFor(totalHints), { size: 22 }));
        meter.appendChild(el('span', { class: 'bk-meter-note' }, totalHints + (totalHints === 1 ? ' hint used' : ' hints used')));
        srText.textContent = 'Message so far: ' + desk.decoded().replace(/·/g, '_');
      }
      var archAnim = null;
      function drawArcs(freshPair) {
        arcs.textContent = '';
        if (!board.classList.contains('is-row')) return;
        var W = tilesBox.clientWidth, H = 92;
        if (!W) return;
        arcs.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        arcs.setAttribute('width', W); arcs.setAttribute('height', H);
        desk.pairs().forEach(function (pr) {
          var a = tiles[pr[0]].root, b = tiles[pr[1]].root;
          var x1 = a.offsetLeft + a.offsetWidth / 2, x2 = b.offsetLeft + b.offsetWidth / 2;
          var span = Math.abs(x2 - x1), h = Math.min(H - 8, 16 + span * 0.5);
          var isSel = sel && (pr[0] === sel || pr[1] === sel);
          var path = el('path', { class: 'bk-arc' + (isSel ? ' is-sel' : '') + (desk.isLocked(pr[0]) ? ' is-locked' : ''), pathLength: '1',
            d: 'M' + x1 + ' ' + H + ' C' + x1 + ' ' + (H - h) + ' ' + x2 + ' ' + (H - h) + ' ' + x2 + ' ' + H });
          arcs.appendChild(path);
          arcs.appendChild(el('circle', { class: 'bk-arc-dot', cx: x1, cy: H - 2, r: 3.5 }));
          arcs.appendChild(el('circle', { class: 'bk-arc-dot', cx: x2, cy: H - 2, r: 3.5 }));
          if (freshPair && pr[0] === freshPair[0] && !api.reducedMotion && Element.prototype.animate) {
            path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 520, easing: 'cubic-bezier(.6,0,.2,1)' });
          }
        });
      }
      function refreshCoach() {
        if (done) return;
        var n = desk.pairCount();
        if (i === 0) {
          var ga = guide[0], gb = guide[1];
          var gaDone = desk.partner(ga[0]) === 'E' || desk.partner('E') === ga[0];
          if (!sortedOnce && n === 0) setCoach('Step 1. Press “Sort by height”. The bars line up like a staircase, and so does English.');
          else if (!gaDone && desk.partner(ga[0]) == null) setCoach('The tallest bar, ' + ga[0] + ', is probably E, the most common English letter. Click ' + ga[0] + ', then E.');
          else if (n === 1) setCoach('Pairs are mutual: if ' + ga[0] + ' stands for E, then E stands for ' + ga[0] + '. Now the second bar, ' + gb[0] + ', is probably T.');
          else if (n < 4) setCoach('Look at the message. A three-letter word that ends in the E you just set is probably “the”. That gives you H.');
          else setCoach('Keep going. Every pair you set makes the next word easier to read.');
        } else if (i === 1) {
          if (n === 0) setCoach('No pulsing hints this time. Start with the tallest bars, then use “the”, “and”, double letters and one-letter words.');
          else if (n < 5) setCoach('Rougher counts here, so check each guess against the words it creates.');
          else setCoach('If a guess makes a word look wrong, undo it. A good guess makes several words readable at once.');
        } else {
          var laid = matches.length && matches.every(function (m) { return L.cribPairs(m.word, rd.crib).every(function (p) { return desk.partner(p[0]) === p[1]; }); });
          textBox.classList.toggle('crib-laid', !!laid);
          if (!laid) setCoach('Too few letters for counting. But we know the message says ' + rd.crib + '. Tap “Lay crib here” on the gold-outlined word.');
          else setCoach('The crib gave us many pairs at once. Now use the words around it, and remember pairs are mutual.');
        }
      }

      /* ------------------------------------------------ actions */
      function select(c) {
        if (done) return;
        sel = c || null;
        refreshSel();
        drawArcs();
        refreshLetterAria();
      }
      function refreshLetterAria() { /* keep aria-label of selected tile current */
        L.ALPHA.split('').forEach(function (c) { refreshLetterLabel(c); });
      }
      function refreshLetterLabel(c) {
        var d = desk.partner(c);
        tiles[c].root.setAttribute('aria-label', 'Letter ' + c + (d ? ', paired with ' + d : ', not paired') + (c === sel ? ', selected' : ''));
      }
      function afterChange(letters, fresh) {
        var seen = {};
        letters.forEach(function (c) { if (!seen[c]) { seen[c] = 1; refreshLetter(c, true); } });
        sel = null;
        refreshSel(); refreshMeta(); drawArcs(fresh); refreshCoach(); refreshLetterAria();
        if (guide) {
          guide.forEach(function (g) { bars[g[0]].root.classList.toggle('is-guide', desk.partner(g[0]) == null && sortedOnce && !done); });
        }
        if (desk.solved()) solve();
      }
      function flagBad(letters, msg) {
        var first = null;
        letters.forEach(function (c) {
          var t = tiles[c].root;
          if (!first) first = t;
          t.classList.add('is-bad'); setTimeout(function () { t.classList.remove('is-bad'); }, 600);
        });
        statusEl.textContent = msg;
        api.wrong(first, msg);
      }
      function attempt(a, b) {
        if (done) return;
        if (desk.partner(a) === b) { select(null); return; }
        var r = desk.pair(a, b);
        if (!r.ok) {
          if (r.reason === 'self') flagBad([a], 'Every letter in this table swaps with a different letter.');
          else flagBad(r.letters, r.letters.map(function (x) { return x + ' is already paired with ' + desk.partner(x) + '.'; }).join(' ') + ' Break that link first.');
          return;
        }
        api.say(a + ' and ' + b + ' are now paired. ' + desk.pairCount() + ' of 13 pairs set.');
        afterChange([a, b], [a, b]);
      }
      function pick(c) {
        if (done) return;
        if (!sel) { select(c); return; }
        if (sel === c) { select(null); return; }
        attempt(sel, c);
      }
      function unlink() {
        if (!sel) return;
        var r = desk.unpair(sel);
        if (!r.ok) {
          if (r.reason === 'locked') flagBad(r.letters, 'That pair was revealed by a hint, so it stays.');
          return;
        }
        api.say(r.letters[0] + ' and ' + r.letters[1] + ' unpaired.');
        afterChange(r.letters);
      }
      function undo() {
        var r = desk.undo();
        if (!r.ok) { api.say('Nothing to undo.'); return; }
        api.say('Undone.');
        afterChange(r.letters);
      }
      function clearAll() {
        var snapshot = desk.pairs();
        var r = desk.clearAll();
        if (!r.ok) return;
        api.say('All your pairs cleared. Undo brings them back.');
        afterChange(snapshot.reduce(function (acc, p) { return acc.concat(p); }, []));
      }
      function useHint(k) {
        if (done) return;
        var r = desk.hint(k);
        if (!r.ok) return;
        totalHints++;
        var letters = [];
        r.pairs.forEach(function (p) { letters.push(p[0], p[1]); });
        r.cleared.forEach(function (p) { letters.push(p[0], p[1]); });
        api.say('Hint: ' + r.pairs.map(function (p) { return p[0] + ' with ' + p[1]; }).join(', ') + '. That costs a third of a diya.');
        r.pairs.forEach(function (p) {
          [p[0], p[1]].forEach(function (c) {
            var t = tiles[c].root; t.classList.add('is-hinted'); setTimeout(function () { t.classList.remove('is-hinted'); }, 1200);
          });
        });
        afterChange(letters, r.pairs[0]);
      }
      function layCrib(start) {
        if (done) return;
        var m = matches.filter(function (x) { return x.start === start; })[0];
        if (!m) return;
        var prs = L.cribPairs(m.word, rd.crib);
        var r = desk.pairMany(prs);
        if (!r.ok) {
          flagBad(r.letters && r.letters.length ? r.letters : [prs[0][0]], 'The crib does not fit with the pairs you already set. Break the clashing link first.');
          return;
        }
        api.say('Crib laid: ' + prs.length + ' pairs set at once.');
        var letters = []; prs.forEach(function (p) { letters.push(p[0], p[1]); });
        afterChange(letters, prs[0]);
      }

      /* ------------------------------------------------ events */
      textBox.addEventListener('click', function (e) {
        var lay = e.target.closest && e.target.closest('.bk-lay');
        if (lay) { layCrib(+lay.getAttribute('data-start')); return; }
        var k = e.target.closest && e.target.closest('.bk-k[data-c]');
        if (k) pick(k.getAttribute('data-c'));
      });
      barsBox.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('.bk-bar');
        if (b) pick(b.getAttribute('data-l'));
      });
      tilesBox.addEventListener('click', function (e) {
        var t = e.target.closest && e.target.closest('.bk-tile');
        if (t) pick(t.getAttribute('data-l'));
      });
      undoBtn.addEventListener('click', undo);
      breakBtn.addEventListener('click', unlink);
      clearBtn.addEventListener('click', clearAll);
      Object.keys(hintBtns).forEach(function (k) { hintBtns[k].addEventListener('click', function () { useHint(k); }); });

      /* board layout: single arch row when wide enough, wrapped grid otherwise */
      function sizeBoard() {
        var w = board.clientWidth;
        board.classList.toggle('is-row', w >= 840);
        drawArcs();
      }
      var ro = null;
      if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(sizeBoard); ro.observe(board); disposers.push(function () { ro.disconnect(); }); }
      else { window.addEventListener('resize', sizeBoard); disposers.push(function () { window.removeEventListener('resize', sizeBoard); }); }
      sizeBoard();

      /* ------------------------------------------------ solve */
      function solve() {
        if (done) return;
        done = true; sel = null;
        refreshSel(); refreshMeta(); drawArcs();
        play.classList.add('is-solved');
        field.classList.add('is-cracked-open');
        api.correct(textPanel, 'Round ' + (i + 1) + ' broken. The message reads clearly.');
        var flips = 0;
        Object.keys(cells).forEach(function (c) {
          cells[c].forEach(function (o) {
            var real = o.real;
            o.k.classList.add('is-cracked', 'is-final');
            if (o.p.textContent !== real) {
              if (flips++ < 60 && !api.reducedMotion) api.anim.flipText(o.p, real, 360); else o.p.textContent = real;
            }
          });
        });
        guide && guide.forEach(function (g) { bars[g[0]].root.classList.remove('is-guide'); });
        var last = i === L.ROUNDS.length - 1;
        var card = el('div', { class: 'bk-done' },
          el('p', { class: 'bk-kicker' }, 'Round ' + (i + 1) + ' broken'),
          el('p', { class: 'bk-quote deva-free' }, '“' + rd.plain + '”'),
          el('p', { class: 'bk-lesson' }, rd.lesson),
          el('p', { class: 'bk-fine' }, desk.pairCount() + ' pairs set · ' + totalHints + (totalHints === 1 ? ' hint' : ' hints') + ' used so far'),
          el('button', { type: 'button', class: 'bk-btn bk-btn-gold bk-btn-lg', on: { click: function () { last ? finale() : nextRound(); } } }, last ? 'How many tables were there?' : 'Next round'));
        doneBox.appendChild(card);
        api.anim.fadeUp(card, { y: 18, duration: 480 });
        setTimeout(function () {
          if (!alive) return;
          var b = card.querySelector('button');
          if (b) { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } }
          if (card.scrollIntoView) card.scrollIntoView({ behavior: api.reducedMotion ? 'auto' : 'smooth', block: 'center' });
        }, api.reducedMotion ? 0 : 900);
        api.say('Round ' + (i + 1) + ' broken. ' + rd.plain);
      }

      /* ------------------------------------------------ first paint */
      L.ALPHA.split('').forEach(function (c) { refreshLetter(c, false); });
      refreshSel(); refreshMeta(); refreshCoach();
      if (guide) {
        guide.forEach(function (g, ix) { bars[g[0]].root.setAttribute('data-guess', ix === 0 ? 'E?' : 'T?'); });
      }

      var ctl = {
        index: i, rd: rd, desk: desk,
        key: function (e) {
          if (done) return;
          if (e.ctrlKey || e.metaKey || e.altKey) {
            if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); undo(); }
            return;
          }
          var k = e.key;
          if (/^[a-zA-Z]$/.test(k)) { e.preventDefault(); pick(k.toUpperCase()); }
          else if (k === 'Escape') { if (sel) { e.preventDefault(); select(null); } }
          else if (k === 'Backspace' || k === 'Delete') { if (sel) { e.preventDefault(); unlink(); } }
        },
        dispose: function () { disposers.forEach(function (f) { f(); }); }
      };
      return ctl;
    }

    /* typing letters must not hijack real controls with their own key use */
    function onKey(e) {
      if (!cur || !alive) return;
      var t = e.target, tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      if ((e.key === 'Enter' || e.key === ' ') && tag === 'BUTTON') return;
      cur.key(e);
    }
    document.addEventListener('keydown', onKey);
    exits.push(function () { document.removeEventListener('keydown', onKey); if (cur) cur.dispose(); });

    function startRound(i) {
      if (cur) { cur.dispose(); cur = null; }
      roundIdx = i;
      field.classList.remove('is-cracked-open');
      cur = buildRound(i);
      if (i > 0) {
        var y = field.getBoundingClientRect().top + window.pageYOffset - 70;
        window.scrollTo({ top: y, behavior: api.reducedMotion ? 'auto' : 'smooth' });
      }
    }
    function nextRound() { startRound(roundIdx + 1); }

    /* ------------------------------------------------ finale */
    function finale() {
      if (cur) { cur.dispose(); cur = null; }
      api.round(3, 3, 'Finale · The count', IKS.howto && IKS.howto.data.breakit ? IKS.howto.data.breakit.goals[3] : null);
      var big = el('div', { class: 'bk-big', 'aria-label': L.formatBig(L.doubleFactorial(25)) + ' possible tables' }, '0');
      var target = L.doubleFactorial(25);
      var factors = [];
      for (var f = 25; f >= 1; f -= 2) factors.push(f);
      var stars = L.starsFor(totalHints);
      var panel = el('section', { class: 'bk-finale', 'aria-labelledby': 'bk-fin-h' },
        el('p', { class: 'bk-kicker' }, 'The count'),
        el('h3', { class: 'bk-h', id: 'bk-fin-h' }, 'How many possible tables?'),
        el('p', { class: 'bk-lede' }, 'Choose 13 disjoint pairs out of 26 letters. The first letter has 25 partners to pick from, the next free one has 23, then 21, and so on:'),
        el('p', { class: 'bk-factors', 'aria-hidden': 'true' }, factors.join(' × ')),
        big,
        el('p', { class: 'bk-big-note' }, 'That is 25!! tables. At one guess a second, trying them all would take about 250,000 years.'),
        el('div', { class: 'bk-contrast' },
          el('div', { class: 'bk-ct' }, el('b', null, 'Huge'), el('span', null, 'Nobody can try every table.')),
          el('div', { class: 'bk-ct bk-ct-hot' }, el('b', null, 'Broken in minutes'), el('span', null, 'We never tried a table. We counted letters, and the pattern of English leaked through.'))),
        el('p', { class: 'bk-lede' }, 'Our test result: a fixed table with no key falls to letter counting. The size of the key space did not matter, because the cipher keeps the habits of the language. This is why modern ciphers use keys and maths, not tables.'),
        el('div', { class: 'bk-fin-actions' },
          el('a', { class: 'btn btn-gold btn-lg', href: '#/level/rsa' }, 'Pivot to RSA →'),
          el('span', { class: 'bk-fine' }, 'You used ' + totalHints + (totalHints === 1 ? ' hint' : ' hints') + ' across three rounds: ' + stars + (stars === 1 ? ' diya' : ' diyas') + '.')));
      stage.textContent = '';
      stage.appendChild(panel);
      api.anim.fadeUp(panel, { y: 20, duration: 520 });
      var scrollT = setTimeout(function () {
        var y = field.getBoundingClientRect().top + window.pageYOffset - 70;
        window.scrollTo({ top: y, behavior: api.reducedMotion ? 'auto' : 'smooth' });
      }, 60);
      exits.push(function () { clearTimeout(scrollT); });
      var fmt = function (n) { return L.formatBig(BigInt(Math.round(n))); };
      (api.reducedMotion ? Promise.resolve() : IKS.anim.roll(big, 0, Number(target), 1900, fmt)).then(function () {
        big.textContent = L.formatBig(target);
        big.classList.add('is-set');
        return api.sleep(1400);
      }).then(function () {
        if (!api.alive()) return;
        return api.complete({ stars: stars });
      });
    }

    /* ------------------------------------------------ why + sources */
    root.appendChild(api.explain('Why counting letters works', [
      el('p', null, 'A substitution table changes which letter is written, never how often it is written. In long English text, e is about one letter in eight and t about one in eleven. Whatever letter the table turns e into inherits that count, so the tallest bar in the ciphertext is very likely e.'),
      el('p', null, 'Each correct guess then exposes more of the message, and the message helps you guess the next pair. Frequency analysis was described long before computers; Kahn’s history traces it back to scholars writing in Arabic. Short messages give rough counts, which is why the third round needed a known word, called a crib.'),
      el('p', null, 'A key changes the whole table for every message. Without a key, anyone who gets enough ciphertext can do what you just did.')]));
    root.appendChild(api.sourceBox(SOURCES));

    startRound(0);
    return function cleanup() { /* exits run through api.onExit */ };
  }

  IKS.registerLevel({
    id: 'breakit', num: 4, title: 'Break It!', tagline: 'Crack a message by counting letters',
    goal: 'Weakness', era: 'Our own test',
    sources: SOURCES, mount: mount
  });
})();
