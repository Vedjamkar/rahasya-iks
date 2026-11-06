/**
 * Rahasya · L1 "The Guru's Chant" (id: chant) · goal: Integrity
 * ---------------------------------------------------------------------------
 * Pure logic first (exported as IKS.logic.chant and module.exports for node),
 * then the DOM level, registered only when a window exists.
 *
 * Index maps (0-based word numbers into the 8-word pada):
 *   krama : 0 1 · 1 2 · 2 3 …                    2(n-1)  items
 *   jaṭā  : i i+1 i+1 i i i+1  for every i        6(n-1)  items
 *   ghana : i i+1 i+1 i i i+1 i+2 i+2 i+1 i i i+1 i+2   13(n-2) items
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------ fixed data */
  var WORDS = ['agnim', 'īḷe', 'purohitam', 'yajñasya', 'devam', 'ṛtvijam', 'hotāram', 'ratnadhātamam'];
  var DEVA = ['अग्निम्', 'ईळे', 'पुरःऽहितम्', 'यज्ञस्य', 'देवम्', 'ऋत्विजम्', 'होतारम्', 'रत्नऽधातमम्'];

  /* Plausible slips per word: [IAST, Devanagari]. Mostly one vowel length or one ending. */
  var VARIANTS = [
    [['agnīm', 'अग्नीम्'], ['agnis', 'अग्निस्'], ['agnir', 'अग्निर्']],
    [['iḷe', 'इळे'], ['īḷā', 'ईळा']],
    [['purohitas', 'पुरःऽहितस्'], ['purohitām', 'पुरःऽहिताम्']],
    [['yajñāsya', 'यज्ञास्य'], ['yajñasyā', 'यज्ञस्या']],
    [['devām', 'देवाम्'], ['devas', 'देवस्']],
    [['ṛtvijām', 'ऋत्विजाम्'], ['ṛtvijas', 'ऋत्विजस्']],
    [['hotaram', 'होतरम्'], ['hotāraḥ', 'होतारः']],
    [['ratnadhātamām', 'रत्नऽधातमाम्'], ['ratnadhātamas', 'रत्नऽधातमस्']]
  ];
  var DEVA_OF = {};
  WORDS.forEach(function (w, i) { DEVA_OF[w] = DEVA[i]; });
  VARIANTS.forEach(function (list) { list.forEach(function (v) { DEVA_OF[v[0]] = v[1]; }); });
  function devaFor(form) { return DEVA_OF[form] || ''; }

  var KINDS = ['krama', 'jata', 'ghana'];

  /* -------------------------------------------------------------- helpers */
  function pick(arr, rng) { return arr[Math.floor((rng || Math.random)() * arr.length)]; }
  function shuffle(arr, rng) {
    var a = arr.slice(), r = rng || Math.random;
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* --------------------------------------------------------- index patterns */
  function kramaIdx(n) {
    var o = [], i;
    for (i = 0; i < n - 1; i++) o.push(i, i + 1);
    return o;
  }
  function jataIdx(n) {
    var o = [], i;
    for (i = 0; i < n - 1; i++) o.push(i, i + 1, i + 1, i, i, i + 1);
    return o;
  }
  function ghanaIdx(n) {
    var o = [], i;
    for (i = 0; i < n - 2; i++) o.push(i, i + 1, i + 1, i, i, i + 1, i + 2, i + 2, i + 1, i, i, i + 1, i + 2);
    return o;
  }
  function idxOf(kind, n) {
    if (kind === 'krama') return kramaIdx(n);
    if (kind === 'jata') return jataIdx(n);
    if (kind === 'ghana') return ghanaIdx(n);
    return [];
  }
  function mapWords(idx, words) { return idx.map(function (i) { return words[i]; }); }
  function krama(words) { return mapWords(kramaIdx(words.length), words); }
  function jata(words) { return mapWords(jataIdx(words.length), words); }
  function ghana(words) { return mapWords(ghanaIdx(words.length), words); }
  /** The krama as a list of 2-word pairs: [[w1,w2],[w2,w3],…] */
  function kramaPairs(words) {
    var out = [], i;
    for (i = 0; i < words.length - 1; i++) out.push([words[i], words[i + 1]]);
    return out;
  }
  function positionsOf(kind, n, word) {
    var out = [];
    idxOf(kind, n).forEach(function (w, p) { if (w === word) out.push(p); });
    return out;
  }
  function sizeFromLength(kind, len) {
    if (kind === 'krama') return len % 2 === 0 ? len / 2 + 1 : 0;
    if (kind === 'jata') return len % 6 === 0 ? len / 6 + 1 : 0;
    if (kind === 'ghana') return len % 13 === 0 ? len / 13 + 2 : 0;
    return 0;
  }

  /* ------------------------------------------------------ corrupt & detect */
  /** Copy of seq with one item replaced. */
  function corrupt(seq, index, newWord) {
    var c = seq.slice();
    c[index] = newWord;
    return c;
  }

  /**
   * Majority-vote detector. `ref` is the verse (or any array with the same word
   * count) or a kind string 'krama' | 'jata' | 'ghana'; the true spellings are
   * never used, only the pattern. Returns null if every repeat agrees, else
   *   { kind, family, ambiguous, positions[], index, word, majority, votes, all[] }
   * `ambiguous: true` means the repeats disagree but tie (a krama pair against
   * its single twin), so we know something changed but not which one.
   * Words that krama says only once (the first and last) cannot be checked by krama alone.
   */
  function findOdd(seq, ref) {
    var kind = null, n = 0;
    if (typeof ref === 'string') { kind = ref; n = sizeFromLength(kind, seq.length); }
    else {
      n = ref.length;
      KINDS.forEach(function (k) { if (idxOf(k, n).length === seq.length) kind = k; });
    }
    if (!kind || !n) return null;
    var idx = idxOf(kind, n), fam = {}, out = [];
    idx.forEach(function (w, p) { (fam[w] = fam[w] || []).push(p); });
    Object.keys(fam).map(Number).sort(function (a, b) { return a - b; }).forEach(function (w) {
      var ps = fam[w], votes = {};
      ps.forEach(function (p) { votes[seq[p]] = (votes[seq[p]] || 0) + 1; });
      var forms = Object.keys(votes);
      if (forms.length < 2) return;
      forms.sort(function (a, b) { return votes[b] - votes[a]; });
      if (votes[forms[1]] === votes[forms[0]]) {
        out.push({ kind: kind, family: w, ambiguous: true, positions: ps.slice(), votes: votes });
      } else {
        var maj = forms[0];
        var odd = ps.filter(function (p) { return seq[p] !== maj; });
        out.push({ kind: kind, family: w, ambiguous: false, majority: maj, positions: odd, index: odd[0], word: seq[odd[0]], votes: votes });
      }
    });
    if (!out.length) return null;
    var first = out[0];
    first.all = out;
    return first;
  }

  /** One random slip in a recitation. opts.interior keeps it off the first and last word. */
  function makeSlip(words, kind, rng, opts) {
    opts = opts || {};
    var n = words.length, base = mapWords(idxOf(kind, n), words), cand = [], w;
    for (w = opts.interior ? 1 : 0; w < (opts.interior ? n - 1 : n); w++) cand.push(w);
    w = pick(cand, rng);
    var p = pick(positionsOf(kind, n, w), rng), v = pick(VARIANTS[w], rng);
    return { kind: kind, seq: corrupt(base, p, v[0]), pos: p, word: w, form: v[0], orig: words[w] };
  }

  /**
   * Two disciples, one slip each, in different places (A: krama, B: jaṭā).
   * type 'split': different words. 'end': both on the first or last word (krama says it once).
   * 'same': both on the same interior word.
   */
  function makeScenario(words, rng, type) {
    var n = words.length;
    type = type || pick(['split', 'end', 'same'], rng);
    var ka, kb, i;
    if (type === 'split') {
      ka = 1 + Math.floor((rng || Math.random)() * (n - 2));
      do { kb = Math.floor((rng || Math.random)() * n); } while (kb === ka);
    } else if (type === 'end') {
      ka = kb = (rng || Math.random)() < 0.5 ? 0 : n - 1;
    } else {
      ka = kb = 1 + Math.floor((rng || Math.random)() * (n - 2));
    }
    var va, vb;
    if (ka === kb) { var two = shuffle(VARIANTS[ka], rng); va = two[0]; vb = two[1]; }
    else { va = pick(VARIANTS[ka], rng); vb = pick(VARIANTS[kb], rng); }
    var pa = pick(positionsOf('krama', n, ka), rng), pb = pick(positionsOf('jata', n, kb), rng);
    var a = { kind: 'krama', pos: pa, word: ka, form: va[0], seq: corrupt(krama(words), pa, va[0]) };
    var b = { kind: 'jata', pos: pb, word: kb, form: vb[0], seq: corrupt(jata(words), pb, vb[0]) };
    i = 0;
    return { type: type, a: a, b: b, truth: words.slice() };
  }

  /**
   * Cross-check: for each word slot, count every spelling seen across the recitations.
   * recs = [{kind, seq}, …] → [{forms:{form:count}, per:[{form:count}, …], total}, …]
   */
  function tally(n, recs) {
    var out = [], k;
    for (k = 0; k < n; k++) out.push({ forms: {}, per: recs.map(function () { return {}; }), total: 0 });
    recs.forEach(function (rec, r) {
      idxOf(rec.kind, n).forEach(function (w, p) {
        var f = rec.seq[p], t = out[w];
        t.forms[f] = (t.forms[f] || 0) + 1;
        t.per[r][f] = (t.per[r][f] || 0) + 1;
        t.total++;
      });
    });
    return out;
  }
  /** Plurality spelling per slot. `ties` lists slots where the top two are level. */
  function resolve(tl) {
    var words = [], ties = [];
    tl.forEach(function (t, k) {
      var fs = Object.keys(t.forms).sort(function (a, b) { return t.forms[b] - t.forms[a]; });
      words.push(fs[0]);
      if (fs.length > 1 && t.forms[fs[1]] === t.forms[fs[0]]) ties.push(k);
    });
    return { words: words, ties: ties };
  }

  /* --------------------------------------------------------------- domino */
  /** Longest chain where each pair's 2nd word is the next pair's 1st word. Returns the pair objects in order. */
  function chainOrder(pairs) {
    var best = [];
    function dfs(chain, used) {
      if (chain.length > best.length) best = chain.slice();
      if (best.length === pairs.length) return;
      var tail = chain[chain.length - 1][1];
      for (var i = 0; i < pairs.length; i++) {
        if (!used[i] && pairs[i][0] === tail) {
          used[i] = true; chain.push(pairs[i]);
          dfs(chain, used);
          chain.pop(); used[i] = false;
        }
      }
    }
    var heads = pairs.map(function (p, i) { return i; }).filter(function (i) {
      return !pairs.some(function (q, j) { return j !== i && q[1] === pairs[i][0]; });
    });
    if (!heads.length) heads = pairs.map(function (p, i) { return i; });
    heads.forEach(function (h) {
      var used = pairs.map(function () { return false; });
      used[h] = true;
      dfs([pairs[h]], used);
    });
    return best;
  }
  /** Can `pair` be added to the end of `chain` (chain empty = it must open the verse)? */
  function judgePlacement(chain, pair, pool, total) {
    var rest = pool.filter(function (q) { return q !== pair && chain.indexOf(q) < 0; });
    if (!chain.length) {
      var closer = pool.filter(function (q) { return q !== pair && q[1] === pair[0]; })[0];
      if (closer) return { ok: false, reason: 'not-head', via: closer };
    } else {
      var tail = chain[chain.length - 1];
      if (pair[0] !== tail[1]) return { ok: false, reason: 'no-link', tail: tail };
    }
    if (chain.length + 1 < total && !rest.some(function (q) { return q[0] === pair[1]; })) {
      return { ok: false, reason: 'forged' };
    }
    return { ok: true };
  }
  /** Verse recovered from an ordered chain of pairs. */
  function padaFromChain(chain) {
    if (!chain.length) return [];
    return [chain[0][0]].concat(chain.map(function (p) { return p[1]; }));
  }

  /** Start with 3 diyas; each slip costs a third of one (rounded), never below 1. */
  function starsFor(wrongs) { return Math.max(1, Math.min(3, Math.round(3 - wrongs / 3))); }

  var logic = {
    WORDS: WORDS, DEVA: DEVA, VARIANTS: VARIANTS, devaFor: devaFor,
    kramaIdx: kramaIdx, jataIdx: jataIdx, ghanaIdx: ghanaIdx, idxOf: idxOf, positionsOf: positionsOf,
    krama: krama, jata: jata, ghana: ghana, kramaPairs: kramaPairs,
    corrupt: corrupt, findOdd: findOdd, makeSlip: makeSlip, makeScenario: makeScenario,
    tally: tally, resolve: resolve, chainOrder: chainOrder, judgePlacement: judgePlacement,
    padaFromChain: padaFromChain, starsFor: starsFor, shuffle: shuffle
  };

  var G = typeof window !== 'undefined' ? window : globalThis;
  G.IKS = G.IKS || {};
  G.IKS.logic = G.IKS.logic || {};
  G.IKS.logic.chant = logic;
  if (typeof module !== 'undefined') module.exports = logic;
  if (typeof window === 'undefined' || !window.IKS || typeof window.IKS.registerLevel !== 'function') return;

  /* ====================================================================== */
  /*                                 THE LEVEL                              */
  /* ====================================================================== */
  var IKS = window.IKS;

  var SOURCES = [
    { text: 'Ṛgveda 1.1.1', tier: 'P' },
    { n: 12, text: 'Filliozat 2006, via "Vedic chant", Wikipedia: recitation styles "acted as a cross check on the other"', tier: 'W', url: 'https://en.wikipedia.org/wiki/Vedic_chant' }
  ];

  function mount(root, api) {
    var el = api.el;
    var rng = Math.random;
    var wrongs = 0;
    var singId = 0;
    var curRound = 0;
    var noteEl = null;
    var test = {};
    var finished = false;

    /* ---------- shell ---------- */
    var hud = el('div', { class: 'cs-hud' });
    var body = el('div', { class: 'cs-body' });
    var hairline = api.motifs.hairline();
    var stage = el('div', { class: 'chant-stage', 'data-round': '1' },
      api.motifs.jaali({ glow: false }),
      el('span', { class: 'cs-mark', 'aria-hidden': 'true', lang: 'sa' }, 'अग्निमीळे'),
      el('div', { class: 'cs-top' },
        el('p', { class: 'cs-kick' }, 'Ṛgveda 1.1.1 · the first line'),
        hud),
      hairline,
      body);
    stage._t = test;

    var explainEl = api.explain('Chants that check themselves', [
      el('p', null, 'Every word is said many times, in different orders. If someone changes one word, the other repeats disagree, a bit like a checksum in computer networks.'),
      el('p', null, 'The krama says each word twice, so it can catch a change in the middle, but the very first and last word get only one saying. Jaṭā and ghana repeat more, so even those get a vote.'),
      el('p', null, 'This protects integrity, not secrecy. Anyone could stand there and listen to the whole thing.')
    ]);

    root.appendChild(el('p', { class: 'chant-intro' },
      'The Ṛgveda was passed on by voice, and nobody hid it. What the chanters worried about was a changed word. So they said every word several times, in overlapping orders, so a change disagrees with its twin. We tried it on the first line.'));
    root.appendChild(stage);
    root.appendChild(explainEl);
    root.appendChild(api.sourceBox(SOURCES));

    setTimeout(function () { hairline.classList.add('is-in'); }, 60);

    /* ---------- small builders ---------- */
    function b(text) { return el('b', { class: 'w' }, text); }
    function txt(parts) {
      return (Array.isArray(parts) ? parts : [parts]).map(function (p) { return p && p.nodeType ? p.textContent : String(p); }).join('');
    }
    function btn(label, cls, fn) {
      return el('button', { type: 'button', class: 'btn ' + (cls || 'btn-gold'), on: { click: fn } }, label);
    }
    function leaf(form, o) {
      o = o || {};
      var tag = o.tag || 'span';
      var n = el(tag, { class: 'leaf' + (o.cls ? ' ' + o.cls : ''), 'data-form': form },
        el('span', { class: 'l-glow', 'aria-hidden': 'true' }),
        o.deva === false ? null : el('span', { class: 'l-deva', lang: 'sa', 'aria-hidden': 'true' }, devaFor(form)),
        el('span', { class: 'l-iast' }, form),
        o.k != null ? el('span', { class: 'l-no', 'aria-hidden': 'true' }, String(o.k + 1)) : null,
        el('i', { class: 'l-ring', 'aria-hidden': 'true' }));
      if (tag === 'button') n.setAttribute('type', 'button');
      return n;
    }
    function ctok(form, k) {
      return el('span', { class: 'ctok', 'data-k': k, 'data-form': form },
        el('sup', { 'aria-hidden': 'true' }, String(k + 1)), form, el('i', { class: 'l-ring', 'aria-hidden': 'true' }));
    }
    function bell(node) {
      var r = node.querySelector('.l-ring');
      if (!r || api.reducedMotion || !r.animate) return;
      r.animate([{ transform: 'scale(.92)', opacity: 0.9 }, { transform: 'scale(1.6)', opacity: 0 }], { duration: 640, easing: 'cubic-bezier(.2,.7,.3,1)' });
    }
    function flash(node, ms) {
      node.classList.add('is-now');
      setTimeout(function () { node.classList.remove('is-now'); }, ms || 480);
    }

    /** Recite: light tiles one by one, bell on each. Resolves when done or cancelled. */
    async function sing(tiles, step, onTick) {
      var my = ++singId;
      tiles.forEach(function (t) { t.classList.remove('is-now', 'is-sung'); });
      if (api.reducedMotion) return;
      for (var i = 0; i < tiles.length; i++) {
        if (my !== singId || !api.alive()) return;
        var t = tiles[i];
        t.classList.add('is-now');
        bell(t);
        if (onTick) onTick(i, t);
        await api.sleep(step);
        t.classList.remove('is-now');
        t.classList.add('is-sung');
      }
    }

    function drawHud(bump) {
      hud.textContent = '';
      hud.appendChild(el('span', { class: 'hud-l' }, wrongs ? wrongs + (wrongs === 1 ? ' slip' : ' slips') : 'No slips yet'));
      hud.appendChild(api.ui.diyas(3, starsFor(wrongs), { size: 20 }));
      if (bump && !api.reducedMotion && hud.animate) hud.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.14)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
    }
    drawHud(false);

    function slip(node, msg) {
      wrongs++;
      drawHud(true);
      api.wrong(node, msg);
    }
    test.wrongs = function () { return wrongs; };

    function setNote(kind, parts) {
      if (!noteEl) return;
      noteEl.className = 'ch-note is-' + kind;
      noteEl.textContent = '';
      (function add(list) {
        (Array.isArray(list) ? list : [list]).forEach(function (p) {
          if (Array.isArray(p)) add(p);
          else if (p != null) noteEl.appendChild(p.nodeType ? p : document.createTextNode(String(p)));
        });
      })(parts);
      noteEl.hidden = false;
      api.anim.fadeUp(noteEl, { y: 8, duration: 260 });
    }

    function newRound(n, title, lead) {
      singId++;
      curRound = n;
      stage.setAttribute('data-round', String(n));
      stage.classList.remove('is-reward');
      api.round(n, 4, title);
      body.textContent = '';
      var h = el('h2', { class: 'ch-h', tabindex: '-1' }, title);
      noteEl = el('div', { class: 'ch-note', hidden: true });
      var wrap = el('section', { class: 'ch-round rd-' + n, 'aria-label': title },
        el('p', { class: 'ch-kick' }, 'Round ' + n + ' of 4'), h, el('p', { class: 'ch-lead' }, lead));
      body.appendChild(wrap);
      api.anim.fadeUp(wrap, { y: 14, duration: 420 });
      if (n > 1) {
        try { stage.scrollIntoView({ behavior: api.reducedMotion ? 'auto' : 'smooth', block: 'start' }); } catch (e) { /* old browsers */ }
        h.focus({ preventScroll: true });
      }
      return wrap;
    }

    /* ---------- the śikhara with the climbing words ---------- */
    function spireBlock() {
      var strips = WORDS.map(function (w, i) {
        return el('div', { class: 'strip', style: { '--y': (17 + i * 8.7).toFixed(1) + '%' } }, leaf(w, { cls: 'xs', deva: false }));
      });
      var bead = el('i', { class: 'bead', 'aria-hidden': 'true' });
      var node = el('div', { class: 'spire', 'aria-hidden': 'true' },
        api.motifs.shikhara(),
        el('div', { class: 'strips' }, strips, bead));
      requestAnimationFrame(function () { node.classList.add('is-in'); });
      function moveBead(i) {
        var s = strips[i];
        if (!s) { bead.classList.remove('is-on'); return; }
        var x = s.offsetLeft + s.offsetWidth + 8, y = s.offsetTop + s.offsetHeight / 2 - 6;
        bead.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        bead.classList.add('is-on');
      }
      return {
        node: node,
        strips: strips,
        now: function (i) {
          strips.forEach(function (s, k) { s.classList.toggle('is-now', k === i); });
          if (i >= 0) { strips[i].classList.add('is-lit'); bell(strips[i].firstChild); }
          moveBead(i);
        },
        light: function (i) { strips[i].classList.add('is-lit'); },
        all: function () { strips.forEach(function (s) { s.classList.add('is-lit'); }); },
        off: function () { strips.forEach(function (s) { s.classList.remove('is-now'); }); bead.classList.remove('is-on'); }
      };
    }

    function pairChip(i, w1, w2, o) {
      o = o || {};
      var t1 = o.tiles ? o.tiles(0) : leaf(w1, { k: i, cls: 'cmp', tag: o.tag }),
        t2 = o.tiles ? o.tiles(1) : leaf(w2, { k: i + 1, cls: 'cmp', tag: o.tag });
      var chip = el('div', { class: 'pairchip' },
        el('span', { class: 'pc-no' }, (i + 1) + ' · ' + (i + 2)),
        el('span', { class: 'pc-tiles' }, t1, el('i', { class: 'pc-link', 'aria-hidden': 'true' }), t2));
      chip._t = [t1, t2];
      return chip;
    }

    /* ====================================================================== */
    /*  ROUND 1: learn the krama, then catch a changed word                    */
    /* ====================================================================== */
    function round1() {
      var wrap = newRound(1, 'Learn the krama',
        'Here is the verse, eight words. After the guru says it once, he teaches the krama: words 1 and 2, then 2 and 3, then 3 and 4, and on down the line.');
      var spire = spireBlock();
      var padaTiles = WORDS.map(function (w, i) { return leaf(w, { k: i, cls: 'lg' }); });
      var padaRow = el('div', { class: 'pada-row', role: 'group', 'aria-label': 'The verse, eight words' }, padaTiles);
      var pairsBox = el('div', { class: 'pairs', role: 'group', 'aria-label': 'The krama pairs' });
      var kramaZone = el('div', { class: 'zone', hidden: true }, pairsBox);
      var discPairs = el('div', { class: 'pairs is-disc', role: 'group', 'aria-label': 'The disciple recites' });
      var discZone = el('div', { class: 'zone', hidden: true }, discPairs);
      var actions = el('div', { class: 'ch-actions' });
      var listen = btn('▶ Listen again', 'btn-ghost btn-sm', function () { playPada(); });

      var main = el('div', { class: 'r-main' },
        el('div', { class: 'row-between' }, el('p', { class: 'mini' }, 'The verse (pada)'), listen),
        padaRow, kramaZone, discZone, noteEl, actions);
      wrap.appendChild(el('div', { class: 'r-grid has-spire' }, el('div', { class: 'spire-col' }, spire.node), main));

      function playPada() {
        spire.strips.forEach(function (s) { s.classList.remove('is-lit'); });
        return sing(padaTiles, 420, function (i) { spire.now(i); }).then(function () { spire.off(); spire.all(); });
      }

      var chips = [];
      async function buildKrama() {
        api.goal('Watch each word land in two overlapping pairs: two witnesses for every middle word.');
        kramaZone.hidden = false;
        pairsBox.textContent = '';
        for (var i = 0; i < 7; i++) {
          if (!api.alive()) return;
          var chip = pairChip(i, WORDS[i], WORDS[i + 1]);
          chips.push(chip);
          pairsBox.appendChild(chip);
          if (!api.reducedMotion) {
            var a = padaTiles[i].getBoundingClientRect(), z = padaTiles[i + 1].getBoundingClientRect(), c = chip.getBoundingClientRect();
            var dx = (a.left + z.right) / 2 - (c.left + c.width / 2), dy = (a.top + a.bottom) / 2 - (c.top + c.height / 2);
            chip.animate([
              { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.5)', opacity: 0 },
              { transform: 'translate(0,0) scale(1.05)', opacity: 1, offset: 0.78 },
              { transform: 'none', opacity: 1 }
            ], { duration: 580, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
            flash(padaTiles[i], 520); flash(padaTiles[i + 1], 520);
            bell(padaTiles[i]); bell(padaTiles[i + 1]);
            await api.sleep(540);
          }
        }
        // show the two witnesses of each middle word
        setNote('info', ['Look at how each word sits in two pairs, once closing a pair and once opening the next. Two witnesses for every word, except the first and last.']);
        if (!api.reducedMotion) {
          for (var k = 1; k <= 6; k++) {
            if (!api.alive()) return;
            var t1 = chips[k - 1]._t[1], t2 = chips[k]._t[0];
            t1.classList.add('is-twin'); t2.classList.add('is-twin');
            bell(t1); bell(t2);
            await api.sleep(360);
            t1.classList.remove('is-twin'); t2.classList.remove('is-twin');
          }
        }
      }

      function startDisciple() {
        api.goal('Tap the word that disagrees with its twin. Check each one against the verse above.');
        var sl = makeSlip(WORDS, 'krama', rng, { interior: true });
        var idx = kramaIdx(8);
        var twinPos = positionsOf('krama', 8, sl.word).filter(function (p) { return p !== sl.pos; })[0];
        test.ans = { pos: sl.pos, twin: twinPos };
        discZone.hidden = false;
        discPairs.textContent = '';
        var tiles = [], found = false;
        for (var j = 0; j < 7; j++) {
          (function (j) {
            var pc = pairChip(j, null, null, {
              tiles: function (side) {
                var p = j * 2 + side;
                var t = leaf(sl.seq[p], { k: idx[p], cls: 'cmp', tag: 'button' });
                t.setAttribute('data-pos', p);
                t.setAttribute('aria-label', 'Pair ' + (j + 1) + ', word ' + (side + 1) + ': ' + sl.seq[p]);
                t.addEventListener('click', function () { choose(p, t); });
                tiles[p] = t;
                return t;
              }
            });
            discPairs.appendChild(pc);
          })(j);
        }
        setNote('info', ['A disciple recites the krama back, but one word has been changed. Tap it. Check each word against the verse above.']);
        actions.textContent = '';
        actions.appendChild(btn('▶ Hear the disciple', 'btn-ghost btn-sm', function () { sing(tiles, 260); }));
        api.anim.stagger(discPairs.children, { step: 50 });
        function choose(p, t) {
          if (found) return;
          if (p === sl.pos) {
            found = true;
            singId++;
            tiles.forEach(function (x) { x.classList.remove('is-now', 'is-sung'); x.disabled = true; });
            t.classList.add('is-bad');
            tiles[twinPos].classList.add('is-twin', 'is-keep');
            api.correct(t, 'Correct. That word was changed.');
            var pj = Math.floor(p / 2) + 1, tj = Math.floor(twinPos / 2) + 1;
            setNote('good', [
              b(sl.form), ' in pair ' + pj + ' · ' + (pj + 1) + ' disagrees with its twin ', b(sl.orig),
              ' in pair ' + tj + ' · ' + (tj + 1) + '. One of two witnesses has to be wrong, and the verse tells us which. A changed word is always caught by its twin.'
            ]);
            actions.textContent = '';
            actions.appendChild(btn('Round 2 →', 'btn-gold', round2));
            actions.firstChild.focus({ preventScroll: true });
          } else if (p === twinPos) {
            t.classList.add('is-ok');
            api.say('That one matches the verse.');
            setNote('info', [b(sl.seq[p]), ' matches the verse. But look at its twin in the neighbouring pair.']);
          } else {
            t.classList.add('is-ok');
            api.say('That one matches the verse.');
            setNote('info', [b(sl.seq[p]), ' matches the verse. Keep listening.']);
          }
        }
      }

      playPada().then(function () {
        if (!api.alive()) return;
        actions.appendChild(btn('Build the krama', 'btn-gold', function (e) {
          actions.textContent = '';
          buildKrama().then(function () {
            if (!api.alive()) return;
            actions.appendChild(btn('A disciple recites it back →', 'btn-gold', startDisciple));
          });
        }));
      });
    }

    /* ====================================================================== */
    /*  ROUND 2: jaṭā by ear                                                  */
    /* ====================================================================== */
    function round2() {
      var wrap = newRound(2, 'Jaṭā by ear',
        'Jaṭā braids each pair three times (1 2 · 2 1 · 1 2) and then steps on by one word. A disciple chanted the whole braid and one sighting is wrong, maybe only by a vowel length. The little number on each word says which word of the verse it is.');
      var n = 8, idx = jataIdx(n);
      var sl = makeSlip(WORDS, 'jata', rng, {});
      var seq = sl.seq, tiles = [], sel = null, solved = false;
      test.ans = { pos: sl.pos };

      var verse = el('p', { class: 'verse-ref' }, el('span', { class: 'mini' }, 'The verse: '),
        WORDS.map(function (w, i) { return el('span', { class: 'vr' }, el('sup', null, String(i + 1)), w); }));
      var groups = el('div', { class: 'groups' });
      for (var g = 0; g < 7; g++) {
        var rows = [];
        for (var r = 0; r < 3; r++) {
          var pair = [];
          for (var c = 0; c < 2; c++) {
            (function (p) {
              var t = leaf(seq[p], { k: idx[p], cls: 'cmp', tag: 'button' });
              t.setAttribute('data-pos', p);
              t.setAttribute('aria-label', 'Group ' + (g + 1) + ', word ' + (idx[p] + 1) + ': ' + seq[p]);
              t.addEventListener('click', function () { select(p); });
              tiles[p] = t;
              pair.push(t);
            })(g * 6 + r * 2 + c);
          }
          rows.push(el('div', { class: 'grp-row' }, pair));
        }
        groups.appendChild(el('div', { class: 'grp' }, el('p', { class: 'grp-h' }, 'Group ' + (g + 1)), rows));
      }

      var hText = el('p', { class: 'hp-text' }, 'Tap any word. We count every sighting of that word of the verse.');
      var hChips = el('div', { class: 'hp-chips', role: 'group', 'aria-label': 'Spellings seen' });
      var flagBtn = el('button', { type: 'button', class: 'btn btn-gold btn-sm', disabled: true, on: { click: flag } }, 'This one was changed');
      var helper = el('div', { class: 'helper' }, hText, hChips, flagBtn);
      var actions = el('div', { class: 'ch-actions' });
      var listen = btn('▶ Hear the disciple', 'btn-ghost btn-sm', function () { sing(tiles, 130); });

      wrap.appendChild(el('div', { class: 'r-main wide' },
        verse, el('div', { class: 'row-between' }, el('p', { class: 'mini' }, '7 groups · 42 sightings'), listen),
        groups, noteEl, actions, helper));

      function famCounts(k) {
        var counts = {}, total = 0;
        idx.forEach(function (w, p) { if (w === k) { counts[seq[p]] = (counts[seq[p]] || 0) + 1; total++; } });
        return { counts: counts, total: total };
      }
      function clearMarks() {
        tiles.forEach(function (t) { t.classList.remove('is-fam', 'is-dim', 'is-sel', 'is-spell'); });
      }
      function select(p) {
        if (solved) return;
        singId++;
        tiles.forEach(function (t) { t.classList.remove('is-now', 'is-sung'); });
        sel = p;
        var k = idx[p], fc = famCounts(k);
        tiles.forEach(function (t, q) {
          var fam = idx[q] === k;
          t.classList.toggle('is-fam', fam);
          t.classList.toggle('is-dim', !fam);
          t.classList.toggle('is-sel', q === p);
          t.classList.remove('is-spell');
        });
        hText.textContent = 'Word ' + (k + 1) + ' is said ' + fc.total + ' times in this chant. These are the spellings we hear:';
        hChips.textContent = '';
        Object.keys(fc.counts).sort(function (a, z) { return fc.counts[z] - fc.counts[a]; }).forEach(function (f) {
          var chip = el('button', { type: 'button', class: 'spell', 'aria-pressed': 'false', on: { click: function () {
            var on = chip.getAttribute('aria-pressed') !== 'true';
            Array.prototype.forEach.call(hChips.children, function (c2) { c2.setAttribute('aria-pressed', 'false'); });
            chip.setAttribute('aria-pressed', on ? 'true' : 'false');
            tiles.forEach(function (t, q) { t.classList.toggle('is-spell', on && idx[q] === k && seq[q] === f); });
          } } }, el('span', { class: 'sp-f' }, f), el('span', { class: 'sp-n' }, '× ' + fc.counts[f]));
          hChips.appendChild(chip);
        });
        flagBtn.disabled = false;
        flagBtn.textContent = 'Flag the highlighted one: “' + seq[p] + '”';
        api.say('Word ' + (k + 1) + ', ' + fc.total + ' sightings.');
      }
      function flag() {
        if (solved || sel == null) return;
        var t = tiles[sel], k = idx[sel], fc = famCounts(k);
        if (sel === sl.pos) {
          solved = true;
          singId++;
          clearMarks();
          tiles.forEach(function (x) { x.disabled = true; x.classList.add('is-dim'); });
          t.classList.remove('is-dim'); t.classList.add('is-bad');
          positionsOf('jata', n, k).forEach(function (q) { if (q !== sel) { tiles[q].classList.remove('is-dim'); tiles[q].classList.add('is-keep'); } });
          flagBtn.disabled = true;
          helper.classList.add('is-done');
          api.correct(t, 'Correct. Found the changed sighting.');
          var gi = Math.floor(sel / 6) + 1, ri = Math.floor((sel % 6) / 2) + 1;
          setNote('good', [
            'Group ' + gi + ', pair ' + ri + ' says ', b(sl.form), ' where the other ' + (fc.total - 1) + ' sightings of word ' + (k + 1) + ' say ', b(sl.orig),
            '. ' + (fc.total - 1) + ' votes to 1. That is how the odd one gets caught, even when it differs by a single vowel length.'
          ]);
          actions.textContent = '';
          actions.appendChild(btn('Round 3 →', 'btn-gold', round3));
          actions.firstChild.focus({ preventScroll: true });
          return;
        }
        var forms = Object.keys(fc.counts), mine = fc.counts[seq[sel]];
        var msg;
        if (forms.length === 1) msg = 'All ' + fc.total + ' sightings of word ' + (k + 1) + ' agree on “' + seq[sel] + '”. Nothing to flag there.';
        else msg = '“' + seq[sel] + '” has ' + mine + ' of ' + fc.total + ' votes, so it stands. Look for a spelling that stands alone.';
        slip(t, msg);
        setNote('bad', [msg]);
      }
      sing(tiles, 120);
    }

    /* ====================================================================== */
    /*  ROUND 3: two disciples, two slips                                     */
    /* ====================================================================== */
    function round3() {
      var wrap = newRound(3, 'Two disciples, two slips',
        'The verse is hidden now. Disciple A recited the krama, disciple B recited the jaṭā. Each made exactly one slip, and we don’t know where. Rebuild the verse: pick a spelling for every numbered slot. Tap a spelling to see which sightings agree with it.');
      var n = 8, sc = makeScenario(WORDS, rng);
      var recs = [{ kind: 'krama', seq: sc.a.seq }, { kind: 'jata', seq: sc.b.seq }];
      var tl = tally(n, recs), res = resolve(tl);
      test.ans = { words: res.words.slice(), type: sc.type };
      var picked = [], active = -1, locked = false, lockTries = 0;
      var cands = tl.map(function (t) { return shuffle(Object.keys(t.forms), rng); });

      /* the recitations, compact */
      var aToks = [], bToks = [];
      var aIdx = kramaIdx(n), bIdx = jataIdx(n);
      var aPairs = el('div', { class: 'rec-pairs' });
      for (var j = 0; j < 7; j++) {
        var p1 = ctok(sc.a.seq[j * 2], aIdx[j * 2]), p2 = ctok(sc.a.seq[j * 2 + 1], aIdx[j * 2 + 1]);
        aToks.push(p1, p2);
        aPairs.appendChild(el('span', { class: 'cpair' }, p1, p2));
      }
      var bGroups = el('div', { class: 'rec-groups' });
      for (var g = 0; g < 7; g++) {
        var gr = el('div', { class: 'cgrp' }, el('span', { class: 'cg-n' }, String(g + 1)));
        for (var q = 0; q < 6; q++) {
          var t = ctok(sc.b.seq[g * 6 + q], bIdx[g * 6 + q]);
          bToks.push(t);
          gr.appendChild(t);
        }
        bGroups.appendChild(gr);
      }
      var allToks = aToks.concat(bToks);

      /* slots */
      var slotNodes = [], slotMeters = [], slotCaps = [], slotCands = [];
      var slotsEl = el('div', { class: 'slots' });
      for (var k = 0; k < n; k++) {
        (function (k) {
          var forms = cands[k];
          var unanimous = forms.length === 1;
          var capEl = el('p', { class: 'meter-cap' });
          var bar = el('i');
          var meter = el('div', { class: 'meter', 'aria-hidden': 'true' }, bar);
          var list = el('div', { class: 'cand-list', role: 'radiogroup', 'aria-label': 'Slot ' + (k + 1) + ' spelling' });
          var btns = forms.map(function (f) {
            var bt = el('button', { type: 'button', class: 'cand', role: 'radio', 'aria-checked': 'false', 'data-form': f,
              on: { click: function () { if (!locked) preview(k, f); } } },
              el('span', { class: 'c-deva', lang: 'sa', 'aria-hidden': 'true' }, devaFor(f)), el('span', { class: 'c-iast' }, f));
            list.appendChild(bt);
            return bt;
          });
          var node = el('div', { class: 'slot' + (unanimous ? ' is-unan' : ' is-open'), 'data-k': k },
            el('div', { class: 'slot-top' }, el('span', { class: 'slot-no' }, String(k + 1)),
              el('span', { class: 'slot-tag' }, unanimous ? 'all agree' : forms.length + ' spellings')),
            list, meter, capEl);
          slotNodes[k] = node; slotMeters[k] = bar; slotCaps[k] = capEl; slotCands[k] = btns;
          slotsEl.appendChild(node);
          if (unanimous) preview(k, forms[0], true);
        })(k);
      }

      function preview(k, form, quiet) {
        picked[k] = form;
        slotCands[k].forEach(function (bt) {
          var on = bt.getAttribute('data-form') === form;
          bt.setAttribute('aria-checked', on ? 'true' : 'false');
          bt.classList.toggle('is-on', on);
        });
        var t = tl[k], agree = t.forms[form], pa = t.per[0][form] || 0, pb = t.per[1][form] || 0;
        var ta = 0, tb = 0, f2;
        for (f2 in t.per[0]) ta += t.per[0][f2];
        for (f2 in t.per[1]) tb += t.per[1][f2];
        slotMeters[k].style.setProperty('--p', (agree / t.total).toFixed(3));
        slotCaps[k].textContent = '“' + form + '”: ' + agree + ' of ' + t.total + ' sightings agree. A ' + pa + '/' + ta + ' · B ' + pb + '/' + tb;
        slotNodes[k].classList.add('is-picked');
        if (quiet) return;
        // highlight sightings of this slot
        active = k;
        allToks.forEach(function (tk) {
          var same = +tk.getAttribute('data-k') === k;
          tk.classList.toggle('is-faint', !same);
          tk.classList.toggle('is-yes', same && tk.getAttribute('data-form') === form);
          tk.classList.toggle('is-no', same && tk.getAttribute('data-form') !== form);
        });
        slotNodes.forEach(function (nd, i) { nd.classList.toggle('is-active', i === k); });
        api.say('Slot ' + (k + 1) + ', ' + form + ': ' + agree + ' of ' + t.total + ' sightings agree.');
        updateLock();
      }

      var lockBtn = el('button', { type: 'button', class: 'btn btn-gold', on: { click: lock } }, 'Lock the verse');
      var actions = el('div', { class: 'ch-actions' }, lockBtn);
      function updateLock() {
        var left = picked.filter(function (x) { return x == null; }).length;
        lockBtn.textContent = 'Lock the verse';
        lockBtn.setAttribute('aria-disabled', left ? 'true' : 'false');
      }
      function lock() {
        if (locked) return;
        var empty = [];
        for (var k = 0; k < n; k++) if (picked[k] == null) empty.push(k + 1);
        if (empty.length) { setNote('info', ['Pick a spelling for slot ' + empty.join(', ') + ' first.']); api.say('Pick a spelling for slot ' + empty.join(', ') + ' first.'); return; }
        var bad = [];
        for (k = 0; k < n; k++) if (picked[k] !== WORDS[k]) bad.push(k);
        if (bad.length) {
          lockTries++;
          var msg = bad.length + (bad.length === 1 ? ' slot does' : ' slots do') + ' not match the true verse yet. Check which spelling most sightings back.';
          slip(slotsEl, msg);
          setNote('bad', [msg]);
          if (lockTries >= 2) {
            slotNodes[bad[0]].classList.add('is-hint');
            setNote('bad', [msg + ' Have another look at slot ' + (bad[0] + 1) + '.']);
          }
          return;
        }
        locked = true;
        singId++;
        slotNodes.forEach(function (nd) { nd.classList.remove('is-active', 'is-hint'); nd.classList.add('is-locked'); });
        allToks.forEach(function (tk) { tk.classList.remove('is-faint', 'is-yes', 'is-no'); });
        lockBtn.hidden = true;
        api.correct(slotsEl, 'Correct. The verse is back.');
        // reasons
        var lines = [];
        for (k = 0; k < n; k++) {
          if (cands[k].length < 2) continue;
          var t = tl[k], others = cands[k].filter(function (f) { return f !== WORDS[k]; });
          lines.push(el('li', null, 'Slot ' + (k + 1) + ': ', b(WORDS[k]), ' had ' + t.forms[WORDS[k]] + ' of ' + t.total + ' sightings (A ' + (t.per[0][WORDS[k]] || 0) + ', B ' + (t.per[1][WORDS[k]] || 0) + '). ',
            others.map(function (f, i) { return [i ? ', ' : '', b(f)]; }), ' had ' + (others.length > 1 ? 'one each' : 'one') + ' and ' + (others.length > 1 ? 'are the slips.' : 'is a slip.')));
        }
        var why = sc.type === 'end'
          ? 'Both slips landed on the same end word. The krama says that word only once, so A alone could never check it, but B says it three times and settles it.'
          : sc.type === 'same'
            ? 'Both slips landed on the same word, in different spellings. Neither one has company, so the true spelling wins with the rest.'
            : 'The two slips were in different words, so each was outvoted by the other disciple, who repeated that word correctly.';
        setNote('good', [el('p', null, 'Nobody had the verse in front of them, yet we rebuilt it. ' + why), el('ul', { class: 'why-list' }, lines)]);
        actions.textContent = '';
        actions.appendChild(btn('Round 4 →', 'btn-gold', round4));
        actions.firstChild.focus({ preventScroll: true });
      }

      var recA = el('div', { class: 'rec' }, el('p', { class: 'rec-h' }, el('span', { class: 'rec-badge' }, 'A'), 'Disciple A · krama'), aPairs);
      var recB = el('div', { class: 'rec' }, el('p', { class: 'rec-h' }, el('span', { class: 'rec-badge' }, 'B'), 'Disciple B · jaṭā'), bGroups);
      var slotsCol = el('div', { class: 'slots-col' },
        el('p', { class: 'rec-h' }, 'The verse, slot by slot'), slotsEl, actions);
      wrap.appendChild(el('div', { class: 'duo' }, el('div', { class: 'recs' }, recA, recB), slotsCol));
      wrap.appendChild(noteEl);
      updateLock();
      setNote('info', ['Slots marked “all agree” are filled in already. The others have more than one spelling in play.']);
      (async function () {
        await sing(aToks, 70);
        if (api.alive()) await sing(bToks, 22);
      })();
    }

    /* ====================================================================== */
    /*  ROUND 4: domino chain, then the ghana climb                           */
    /* ====================================================================== */
    function round4() {
      var wrap = newRound(4, 'Rebuild the order',
        'These are the krama pairs, shuffled. Chain them so each pair starts with the word the last one ended on, and the verse comes back in order. One pair in the pile was garbled.');
      var n = 8, real = kramaPairs(WORDS);
      var jf = Math.floor(rng() * 6);               // forge a pair whose second word has a follower
      var fv = pick(VARIANTS[jf + 1], rng);
      var decoy = [WORDS[jf], fv[0]];
      var pool = shuffle(real.concat([decoy]), rng);
      var chain = [], busy = false, done = false, skip = false;
      test.ans = { order: real.map(function (p) { return p[0] + ' ' + p[1]; }) };

      function half(form) {
        return el('span', { class: 'dm-half' }, el('span', { class: 'l-deva', lang: 'sa', 'aria-hidden': 'true' }, devaFor(form)), el('span', { class: 'l-iast' }, form));
      }
      var spire = spireBlock();

      var slotEls = [];
      var chainEl = el('ol', { class: 'chain4', 'aria-label': 'Your chain, first pair at the top' });
      for (var s = 0; s < 7; s++) {
        var slotEl = el('li', { class: 'chain-slot' }, el('span', { class: 'cs-n', 'aria-hidden': 'true' }, String(s + 1)),
          el('span', { class: 'cs-empty' }, s === 0 ? 'the pair that opens the verse' : ''));
        slotEls.push(slotEl);
        chainEl.appendChild(slotEl);
      }

      var items = pool.map(function (pr) {
        var node = el('button', { type: 'button', class: 'domino', 'data-a': pr[0], 'data-b': pr[1],
          'aria-label': 'Pair: ' + pr[0] + ' then ' + pr[1] }, half(pr[0]), el('i', { class: 'dm-bar', 'aria-hidden': 'true' }), half(pr[1]));
        var it = { pair: pr, node: node, used: false, decoy: pr === decoy };
        node.addEventListener('click', function () { place(it); });
        return it;
      });
      var tray = el('div', { class: 'tray4', role: 'group', 'aria-label': 'Pairs to place' }, items.map(function (it) { return it.node; }));
      var trail = el('p', { class: 'trail', 'aria-hidden': 'true', hidden: true });
      var cap = el('p', { class: 'climb-cap', hidden: true });
      var actions = el('div', { class: 'ch-actions' });

      var hint = el('p', { class: 'mini hint' }, 'Hint: in the krama, only the very first word never ends a pair.');
      wrap.appendChild(el('div', { class: 'r4' },
        el('div', { class: 'spire-col' }, spire.node),
        el('div', { class: 'chain-col' }, el('p', { class: 'mini' }, 'Your chain'), chainEl),
        el('div', { class: 'tray-col' }, el('p', { class: 'mini' }, 'The pile'), tray, hint, noteEl, trail, cap, actions)));

      async function place(it) {
        if (busy || done || it.used) return;
        var j = judgePlacement(chain.map(function (c) { return c.pair; }), it.pair, pool, 7);
        if (!j.ok) {
          var msg;
          if (j.reason === 'not-head') msg = '“' + it.pair[0] + '” already closes another pair (' + j.via[0] + ' ' + j.via[1] + '), so this cannot open the verse.';
          else if (j.reason === 'no-link') msg = 'The chain ends on “' + j.tail[1] + '”, but this pair starts with “' + it.pair[0] + '”.';
          else msg = 'No pair continues from “' + it.pair[1] + '”, and its twin elsewhere says otherwise. This one is garbled.';
          slip(it.node, msg);
          setNote('bad', [msg]);
          return;
        }
        busy = true;
        var from = it.node.getBoundingClientRect();
        it.used = true;
        it.node.classList.add('is-used');
        it.node.disabled = true;
        chain.push(it);
        var slotEl = slotEls[chain.length - 1];
        slotEl.classList.add('is-filled');
        var placed = el('div', { class: 'domino placed' }, half(it.pair[0]), el('i', { class: 'dm-bar', 'aria-hidden': 'true' }), half(it.pair[1]));
        slotEl.appendChild(placed);
        var joint = null;
        if (chain.length > 1) {
          joint = el('span', { class: 'joint', 'aria-hidden': 'true' }, '= ' + it.pair[0]);
          slotEl.appendChild(joint);
        }
        if (!api.reducedMotion && placed.animate) {
          var to = placed.getBoundingClientRect();
          var dx = from.left - to.left, dy = from.top - to.top;
          placed.animate([
            { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.94)', opacity: 0.9 },
            { transform: 'translate(0,0) scale(1.04)', opacity: 1, offset: 0.8 },
            { transform: 'none', opacity: 1 }
          ], { duration: 460, easing: 'cubic-bezier(.2,.8,.2,1)' });
          if (joint) joint.animate([{ transform: 'translateX(-50%) scale(0)', opacity: 0 }, { transform: 'translateX(-50%) scale(1.25)', opacity: 1, offset: 0.6 }, { transform: 'translateX(-50%) scale(1)', opacity: 1 }], { duration: 520, delay: 300, easing: 'ease-out', fill: 'backwards' });
        }
        api.correct(placed, chain.length === 1 ? 'Correct. That opens the verse.' : 'Correct. ' + it.pair[0] + ' joins on.');
        spire.light(chain.length - 1);
        if (chain.length === 1) spire.light(0);
        setNote('good', [chain.length === 1 ? 'That opens the verse: nothing ends on ' : 'Snap. The chain now ends on ', b(it.pair[1]), '.']);
        await api.sleep(520);
        if (!api.alive()) return;
        busy = false;
        if (chain.length === 7) { finish(); return; }
        var nextIt = items.filter(function (x) { return !x.used; })[0];
        if (nextIt) nextIt.node.focus({ preventScroll: true });
      }

      async function finish() {
        done = true;
        spire.light(7);
        items.forEach(function (it) {
          if (it.decoy && !it.used) { it.node.classList.add('is-forged'); it.node.disabled = true; }
        });
        stage.classList.add('is-reward');
        hint.hidden = true;
        var verse = padaFromChain(chain.map(function (c) { return c.pair; }));
        setNote('good', ['Seven pairs, one verse: ', verse.map(function (w, i) { return [i ? ' ' : '', b(w)]; }),
          '. The leftover pair (', b(decoy[0] + ' ' + decoy[1]), ') never links up, because its twin disagrees. That is how a garbled pair shows itself.']);
        api.say('Verse restored.');
        await api.sleep(900);
        if (!api.alive()) return;
        await climb();
      }

      async function climb() {
        var gi = ghanaIdx(8);
        spire.strips.forEach(function (s) { s.classList.remove('is-lit'); });
        trail.hidden = false; cap.hidden = false; trail.textContent = '';
        cap.textContent = 'Last thing. Ghana braids three words at a time. This is the ghana of the first word, climbing the spire: 1 2 2 1 1 2 3 3 2 1 1 2 3.';
        var skipBtn = btn('Skip the climb', 'btn-ghost btn-sm', function () { skip = true; skipBtn.hidden = true; });
        actions.appendChild(skipBtn);
        if (!api.reducedMotion) {
          for (var s = 0; s < gi.length; s++) {
            if (!api.alive()) return;
            if (skip) break;
            var g = Math.floor(s / 13);
            spire.now(gi[s]);
            if (g === 0) {
              var tk = ctok(WORDS[gi[s]], gi[s]);
              tk.classList.add('is-in');
              trail.appendChild(tk);
              bell(tk);
            } else if (s % 13 === 0) {
              cap.textContent = 'Group ' + (g + 1) + ' of 6: words ' + (g + 1) + ', ' + (g + 2) + ', ' + (g + 3) + '. The chant moves up one word at a time, always overlapping.';
            }
            await api.sleep(g === 0 ? 340 : 90);
          }
        }
        if (!api.alive()) return;
        if (!trail.firstChild) {
          gi.slice(0, 13).forEach(function (w) { trail.appendChild(ctok(WORDS[w], w)); });
        }
        spire.off(); spire.all();
        skipBtn.hidden = true;
        cap.textContent = 'That is ghana. Every word gets checked from three sides, and it still gives nothing away.';
        finished = true;
        explainEl.open = true;
        await api.sleep(500);
        if (!api.alive()) return;
        api.complete({ stars: starsFor(wrongs) });
      }

      // keyboard help: focus first domino
      items[0].node.focus({ preventScroll: true });
      setNote('info', ['Start with the pair that opens the verse. Then add the pair that starts with the word the chain ended on.']);
    }

    round1();

    return function cleanup() { singId++; };
  }

  IKS.registerLevel({
    id: 'chant', num: 1, title: "The Guru's Chant", tagline: 'Find the changed word',
    goal: 'Integrity', era: 'Vedic recitation', icon: '🪔',
    sources: SOURCES,
    mount: mount
  });
})();
