/* Rahasya live figures. Each figure: one control, one result, one caption, computed live. */
(function () {
  'use strict';
  var IKS = window.IKS, P = IKS.paper, doc = document;
  function $(id) { return doc.getElementById(id); }
  function say(m) { var l = $('live'); if (l) l.textContent = m; }

  /* ------------------------------------------------ Fig. 2: the missing years (one leaf per century) */
  (function () {
    var host = $('yrs'); if (!host) return;
    var START = -400, N = 17;
    /* the same date ranges as Table 1. name = the last point a text only names it; method = when the method appears */
    var SCEN = [
      { k: 'Closest dates', name: 600, method: 900, why: 'Kama Sutra at its latest, Jayamaṅgalā at its earliest.' },
      { k: 'Middle dates', name: 300, method: 1100, why: 'Both texts at the middle of their date ranges.' },
      { k: 'Furthest dates', name: 0, method: 1300, why: 'Kama Sutra at its earliest, Jayamaṅgalā at its latest.' }
    ];
    var leaves = [], axis = $('yrs-axis'), ctl = $('yrs-ctl'), num = $('yrs-num'), btns = [];
    for (var i = 0; i < N; i++) {
      var y = START + i * 100, d = doc.createElement('div');
      d.className = 'yr'; d.style.setProperty('--i', i); host.appendChild(d); leaves.push(d);
      var a = doc.createElement('span');
      a.textContent = (i % 4 === 0) ? (y < 0 ? -y + ' BCE' : y + ' CE') : ''; axis.appendChild(a);
    }
    function show(s, announce) {
      var gap = s.method - s.name;
      leaves.forEach(function (l, i) {
        var from = START + i * 100, to = from + 100, c = 'yr';
        if (from >= s.method || to > 1300 - 1 && s.method >= 1300) c += ' is-method';
        else if (to <= s.name) c += ' is-name';
        else c += ' is-gap';
        l.className = c;
      });
      btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b._s === s)); });
      P.roll(num, gap);
      if (announce) say(gap + ' years. ' + s.why);
    }
    SCEN.forEach(function (s) {
      var b = doc.createElement('button');
      b.type = 'button'; b.className = 'plq'; b.textContent = s.k; b.title = s.why; b._s = s;
      b.addEventListener('click', function () { show(s, true); });
      ctl.appendChild(b); btns.push(b);
    });
    num._v = 0;
    show(SCEN[1]);
    P.inView(host, function () { host.classList.add('is-in'); P.roll(num, 800); }, { threshold: 0.25 });
  })();

  /* ------------------------------------------------ Fig. 4: letter counting */
  (function () {
    var L = IKS.logic && IKS.logic.breakit, host = $('cnt-bars'); if (!L || !host) return;
    var TABLE = L.randomReciprocal(4107, 13), num = $('cnt-num'), sub = $('cnt-sub'), rec = $('cnt-rec'), take = $('cnt-take'), box = $('cnt-text');
    var pct = function (n) { return n.toFixed(1) + '%'; };
    function run(text) {
      var plain = String(text), cipher = L.applyPairs(plain, TABLE).toUpperCase(), up = plain.toUpperCase();
      var rank = L.rankCipher(cipher), counts = L.freq(cipher), guess = {};
      rank.forEach(function (c, k) { guess[c] = L.ENGLISH_ORDER[k]; });
      var ok = 0, tot = 0, html = doc.createDocumentFragment(), run_ = '', cls = '';
      function flush() { if (!run_) return; var s = doc.createElement('span'); s.className = cls; s.textContent = run_; html.appendChild(s); run_ = ''; }
      for (var i = 0; i < up.length; i++) {
        var c = cipher[i], p = up[i], k = 'n', ch = plain[i];
        if (/[A-Z]/.test(c)) { tot++; if (guess[c] === p) { ok++; k = 'y'; } else ch = guess[c].toLowerCase(); }
        else k = cls || 'n';
        if (k !== cls) { flush(); cls = k; }
        run_ += ch;
      }
      flush();
      rec.textContent = ''; rec.appendChild(html);
      var max = counts[rank[0]] || 1;
      host.textContent = '';
      rank.forEach(function (c, n) {
        var bar = doc.createElement('div'), i_ = doc.createElement('i'), b = doc.createElement('b');
        bar.className = 'bar' + (TABLE[c] === guess[c] ? ' ok' : ''); bar.style.setProperty('--i', n);
        i_.style.setProperty('--h', Math.round(counts[c] / max * 100) + '%'); b.textContent = guess[c];
        bar.appendChild(i_); bar.appendChild(b); host.appendChild(bar);
      });
      var value = tot ? ok / tot * 100 : 0;
      if (tot < 30) { num.textContent = '–'; num._v = 0; sub.textContent = 'That is too short to count. Try at least 30 letters.'; return value; }
      P.roll(num, value, pct); if (take) take.textContent = pct(value);
      sub.textContent = 'of ' + tot + ' letters correct by counting alone.';
      say(pct(value) + ' of ' + tot + ' letters correct by counting alone.');
      return value;
    }
    box.value = L.ROUNDS[0].plaintext;
    run(box.value);
    var t; box.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { run(box.value); }, 160); });
    num._v = 0; num.textContent = pct(0);
    P.inView(host, function () { host.classList.add('is-in'); run(box.value); }, { threshold: 0.2 });
  })();

  /* ================================================================ helpers for the figures below */
  function h(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function ap(parent) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]); return parent; }
  var SVGNS = 'http://www.w3.org/2000/svg';
  function sv(tag, attrs, parent) { var e = doc.createElementNS(SVGNS, tag); for (var k in (attrs || {})) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function flat(a) { return [].concat.apply([], a); }
  function pressOnly(btns, on) { btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b === on)); }); }

  /* ------------------------------------------------ Sources by tier (section 2) */
  (function () {
    var bar = $('tierbar'), list = $('src-list'); if (!bar || !list) return;
    var TIERS = [['P', 'Primary text'], ['R', 'Peer-reviewed'], ['T', 'Preprint or report'], ['W', 'Overview page'], ['B', 'Book']];
    var short = {};
    Array.prototype.forEach.call(doc.querySelectorAll('#sec-2 .full-in tbody tr'), function (tr) {
      var a = tr.querySelector('a[href^="#ref-"]'), td = tr.children[1];
      if (a && td) short[a.getAttribute('href').slice(5)] = td.textContent.trim();
    });
    var rows = Array.prototype.map.call(doc.querySelectorAll('.refs2 li'), function (li) {
      var m = /seal-([A-Z])/.exec((li.querySelector('.seal') || {}).className || '');
      var n = li.id.replace('ref-', ''), full = (li.querySelector('div') || li).textContent.trim();
      return { n: n, t: m ? m[1] : '', name: short[n] || full.replace(/\s+/g, ' ').slice(0, 64) };
    });
    var total = rows.length, on = {}, btns = [], items = [];
    var count = h('p', 'src-count'), ul = h('ul', 'srcs');
    TIERS.forEach(function (t) { on[t[0]] = true; });
    TIERS.forEach(function (t) {
      var n = rows.filter(function (r) { return r.t === t[0]; }).length; if (!n) return;
      var b = h('button', 'tb'); b.type = 'button'; b.dataset.t = t[0]; b.style.setProperty('--n', n);
      b.setAttribute('aria-pressed', 'true'); b.setAttribute('aria-label', t[1] + ', ' + n + ' sources'); b.title = t[1];
      var num = h('b', null, String(n)), lab = h('span', 'tb-l'); lab.appendChild(h('i', null, t[0])); lab.appendChild(h('s', null, ' ' + t[1]));
      ap(b, num, lab); b._t = t; b._n = n;
      b.addEventListener('click', function () {
        on[t[0]] = !on[t[0]]; b.setAttribute('aria-pressed', String(on[t[0]])); render(true);
        say(t[1] + (on[t[0]] ? ' shown. ' : ' hidden. ') + shown() + ' of ' + total + ' sources shown.');
      });
      bar.appendChild(b); btns.push(b);
    });
    rows.forEach(function (r) {
      var li = h('li'), s = h('span', 'seal seal-' + r.t, r.t), a = h('a', null, r.name); a.href = '#ref-' + r.n;
      var nn = h('span', 'src-n', r.n + '.'); ap(li, s, nn, a); li._r = r; ul.appendChild(li); items.push(li);
    });
    function shown() { return rows.filter(function (r) { return on[r.t]; }).length; }
    function render(anim) {
      var k = 0;
      items.forEach(function (li) {
        var vis = !!on[li._r.t], was = !li.hidden;
        li.hidden = !vis;
        if (vis && anim && !was) { li.style.setProperty('--i', k++); li.classList.remove('is-new'); void li.offsetWidth; li.classList.add('is-new'); }
      });
      count.textContent = '';
      var b = h('b', null, String(shown())); count.appendChild(doc.createTextNode('Showing ')); count.appendChild(b);
      count.appendChild(doc.createTextNode(' of ' + total + ' sources' + (shown() ? '' : '. Press a tier to bring its sources back.')));
    }
    ap(list, count, ul); render(false);
    Array.prototype.forEach.call(doc.querySelectorAll('[data-live="src-total"]'), function (n) {
      var t = n.querySelector('.w > span') || n; t.textContent = String(total);
    });
    P.inView(bar, function () { bar.classList.add('is-in'); }, { threshold: 0.25 });
  })();

  /* ------------------------------------------------ Table 1: place each practice (section 5) */
  (function () {
    var host = $('fig-table1'), data = $('t1-data'); if (!host || !data) return;
    var GOALS = [
      { k: 'integrity', n: 'Integrity', c: 'var(--c-int)', g: 'श्रु' },
      { k: 'confidentiality', n: 'Confidentiality', c: 'var(--c-con)', g: 'गु' },
      { k: 'encoding', n: 'Encoding, not secrecy', c: 'var(--c-enc)', g: 'अं' },
      { k: 'hidden', n: 'Hidden meaning or access', c: 'var(--c-hid)', g: 'परो' }
    ], G = {};
    GOALS.forEach(function (g) { G[g.k] = g; });
    var R = Array.prototype.map.call(data.querySelectorAll('tbody tr[data-goal]'), function (tr) {
      function t(c) { var n = tr.querySelector(c); return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; }
      return { goal: tr.dataset.goal, method: tr.dataset.method || '', practice: t('.c-practice'), period: t('.c-period'), place: t('.c-goal'), why: t('.c-why'), modern: t('.c-modern') };
    });
    var N = R.length; if (!N) return;
    var i = 0, picks = [], waiting = false, done = false;

    var top = h('div', 't1-top'), live = h('p', 't1-live'), all = h('button', 'plq t1-all', 'Show all our placements'); all.type = 'button';
    var card = h('div', 'deck-card'), cn = h('small', 't1-count'), cb = h('b'), cs = h('span'); ap(card, cn, cb, cs);
    var niches = h('div', 'niches'), why = h('div', 'deck-why'), res = h('ol', 't1-res'), sum = h('p', 't1-sum'), again = h('button', 'plq t1-again', 'Place them again'); again.type = 'button';
    var nb = {};
    GOALS.forEach(function (g) {
      var b = h('button', 'niche2'); b.type = 'button'; b.dataset.goal = g.k; b.style.setProperty('--c', g.c);
      ap(b, h('u', 'deva', g.g), doc.createTextNode(g.n), h('em')); b.setAttribute('aria-label', 'Place under ' + g.n);
      b.addEventListener('click', function () { choose(g.k, b); });
      niches.appendChild(b); nb[g.k] = b;
    });
    ap(top, live, all); ap(host, top, card, niches, why, sum, res, again);
    res.hidden = true; sum.hidden = true; again.hidden = true;

    function stats() {
      var placed = picks.filter(function (p) { return p; }).length, match = 0;
      picks.forEach(function (p, k) { if (p && p === R[k].goal) match++; });
      return { placed: placed, match: match };
    }
    function liveLine() {
      var s = stats(); live.textContent = '';
      ap(live, doc.createTextNode('You placed '), h('b', null, String(s.placed)), doc.createTextNode(' of ' + N + '. '), h('b', null, String(s.match)), doc.createTextNode(' match ours.'),
        h('small', null, 'This is our judgement. You may disagree.'));
    }
    function showCard(animate) {
      cn.textContent = 'Practice ' + (i + 1) + ' of ' + N; cb.textContent = R[i].practice; cs.textContent = R[i].period;
      card.style.visibility = ''; card.classList.remove('is-new');
      if (animate && !P.rm()) { void card.offsetWidth; card.classList.add('is-new'); }
    }
    function lock(on) { Array.prototype.forEach.call(niches.children, function (b) { b.disabled = on; }); }
    function fly(niche, cb2) {
      if (P.rm()) { cb2(); return; }
      var d = host.getBoundingClientRect(), c = card.getBoundingClientRect(), n = niche.getBoundingClientRect();
      var g = card.cloneNode(true); g.className = 'deck-card t1-ghost';
      g.style.cssText = 'left:' + (c.left - d.left) + 'px;top:' + (c.top - d.top) + 'px;width:' + c.width + 'px;height:' + c.height + 'px';
      host.appendChild(g); card.style.visibility = 'hidden';
      var dx = n.left + n.width / 2 - (c.left + c.width / 2), dy = n.top + n.height * 0.6 - (c.top + c.height / 2), s = Math.min(0.4, n.width / c.width * 0.8);
      var a = g.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')', opacity: 0.12 }],
        { duration: 640, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' });
      a.onfinish = function () { g.remove(); niche.classList.remove('is-hit'); void niche.offsetWidth; niche.classList.add('is-hit'); cb2(); };
    }
    function choose(k, niche) {
      if (waiting || done) return;
      waiting = true; picks[i] = k; lock(true);
      var r = R[i];
      fly(niche, function () {
        why.textContent = '';
        var same = k === r.goal;
        ap(why, h('p', null), h('p', null));
        why.children[0].innerHTML = '<b>You chose</b> ' + G[k].n + '. <b>Our placement:</b> ' + r.place + '. ' + (same ? 'That matches ours.' : 'Ours is different, and you may be right.');
        why.children[1].innerHTML = '<b>Why:</b> ' + r.why + '. <b>Modern idea:</b> ' + r.modern + '.';
        var nx = h('button', 'plq t1-next', i < N - 1 ? 'Next practice' : 'See all nine'); nx.type = 'button';
        nx.addEventListener('click', function () { if (i < N - 1) { i++; waiting = false; why.textContent = ''; lock(false); showCard(true); } else finish(); });
        why.appendChild(nx); nx.focus({ preventScroll: true });
        liveLine(); var s = stats();
        say('You chose ' + G[k].n + '. Our placement: ' + r.place + '. You placed ' + s.placed + ' of ' + N + ', ' + s.match + ' match ours.');
      });
    }
    function finish() {
      done = true; waiting = false; lock(true);
      var conf = R.filter(function (r) { return r.goal === 'confidentiality'; }), meth = conf.filter(function (r) { return r.method === 'yes'; });
      card.hidden = true; why.textContent = ''; why.hidden = true; all.hidden = true;
      GOALS.forEach(function (g) {
        var n = R.filter(function (r) { return r.goal === g.k; }).length; nb[g.k].querySelector('em').textContent = n + (n === 1 ? ' practice' : ' practices');
      });
      res.textContent = '';
      R.forEach(function (r, k) {
        var li = h('li'), dot = h('i'), box = h('div'); dot.style.setProperty('--c', G[r.goal].c); li.style.setProperty('--i', k);
        ap(box, h('b', null, r.practice), h('span', null, 'Ours: ' + r.place + (picks[k] ? (picks[k] === r.goal ? '. You: same.' : '. You: ' + G[picks[k]].n + '.') : '')));
        ap(li, dot, box); res.appendChild(li);
      });
      sum.textContent = '';
      ap(sum, h('b', null, String(conf.length)), doc.createTextNode(' of ' + N + ' rows are confidentiality, and '), h('b', null, String(meth.length)), doc.createTextNode(' of those gives a method.'));
      res.hidden = false; sum.hidden = false; again.hidden = false; liveLine();
      say(conf.length + ' of ' + N + ' rows are confidentiality, and ' + meth.length + ' of those gives a method.');
    }
    all.addEventListener('click', function () { if (!done) { waiting = false; finish(); } });
    again.addEventListener('click', function () {
      i = 0; picks = []; waiting = false; done = false; lock(false);
      card.hidden = false; why.hidden = false; why.textContent = ''; all.hidden = false; res.hidden = true; sum.hidden = true; again.hidden = true;
      GOALS.forEach(function (g) { nb[g.k].querySelector('em').textContent = ''; });
      showCard(true); liveLine(); say('Starting again.');
    });
    showCard(false); liveLine();
  })();

  /* ------------------------------------------------ Fig. 1: recitation as a stepped brick altar (section 7) */
  (function () {
    var host = $('fig-1'), C = IKS.logic && IKS.logic.chant, ISO = IKS.iso; if (!host || !C || !ISO) return;
    var W = C.WORDS, n = W.length, DEF = 3;
    var STY = [
      { k: 'ghana', name: 'Ghana', seq: flat(C.ghanaIdx(n)), cols: 13, where: 'bottom course' },
      { k: 'jata', name: 'Jaṭā', seq: flat(C.jataIdx(n)), cols: 9, where: 'third course' },
      { k: 'krama', name: 'Krama', seq: flat(C.kramaIdx(n)), cols: 7, where: 'second course' },
      { k: 'pada', name: 'Pada', seq: W.map(function (_, q) { return q; }), cols: 4, where: 'top course' }
    ];
    var BW = 1, BD = 1.4, BH = 1.0, S = 22, FW = 13, FD = 6 * BD;
    var maxX = FW, minY = 0, maxY = FD, top = STY.length * BH;
    var x0 = (0 - maxY) * 0.866 * S - 14, x1 = maxX * 0.866 * S + 14, y0 = -top * S - 14 - 10, y1 = (maxX + maxY) * 0.5 * S + 14;
    var svg = sv('svg', { class: 'iso alt', viewBox: [x0, y0, x1 - x0, y1 - y0].map(function (v) { return v.toFixed(0); }).join(' '), 'aria-hidden': 'true', focusable: 'false' });
    var g = sv('g', null, svg), CL = { t: '#D9794A', l: '#8C3B22', r: '#AE5230' }, polys = 0, order = 0;
    STY.slice().forEach(function (s, ci) {
      var rows = Math.ceil(s.seq.length / s.cols), ox = (FW - s.cols * BW) / 2, oy = (FD - rows * BD) / 2, cells = [];
      s.seq.forEach(function (w, k) { cells.push({ k: k, w: w, x: ox + (k % s.cols) * BW, y: oy + Math.floor(k / s.cols) * BD }); });
      s.bricks = [];
      cells.slice().sort(function (a, b) { return (a.x + a.y) - (b.x + b.y) || a.k - b.k; }).forEach(function (c) {
        var tone = [0.84, 0.95, 1.04, 1.13][ci] + (((c.k * 37 + ci * 11) % 9) - 4) / 100;
        var col = { t: ISO.shade(CL.t, tone), l: ISO.shade(CL.l, tone), r: ISO.shade(CL.r, tone) };
        var b = ISO.brick(g, c.x + 0.03, c.y + 0.03, ci * BH, BW - 0.06, BD - 0.06, BH - 0.05, S, col);
        b.dataset.w = c.w; polys += 3; s.bricks[c.k] = b;
      });
    });
    STY.forEach(function (s) { s.bricks.forEach(function (b) { b._o = order++; }); });

    var art = h('div', 'c1-art'), side = h('div', 'c1-side'), hint = h('p', 'hint', 'Choose the word that gets changed.'), pl = h('div', 'plaques');
    var rowsUl = h('ul', 'c1-rows'), btns = [], cells = {}, built = false, cur = DEF;
    art.appendChild(svg);
    W.forEach(function (w, q) {
      var b = h('button', 'plq'); b.type = 'button'; b.textContent = (q + 1) + ' · ' + w; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { pick(q, true); }); pl.appendChild(b); btns.push(b);
    });
    STY.slice().reverse().forEach(function (s) {
      var li = h('li', 'c1-row'), nm = h('span', 'c1-nm', s.name), v = h('span', 'big c1-v', '0'), tx = h('span', 'c1-tx');
      tx.appendChild(h('span', null, 'of ' + s.seq.length + ' words said')); tx.appendChild(h('small', null, s.where));
      ap(li, nm, v, tx); rowsUl.appendChild(li); cells[s.k] = v;
    });
    function count(s, q) { return s.seq.filter(function (x) { return x === q; }).length; }
    function pick(q, announce) {
      cur = q; pressOnly(btns, btns[q]);
      STY.forEach(function (s) { var c = count(s, q); P.roll(cells[s.k], c, function (x) { return String(Math.round(x)); }); });
      if (built) hits(q);
      if (announce) say('Word ' + (q + 1) + ', ' + W[q] + ': said ' + STY.slice().reverse().map(function (s) { return count(s, q) + ' in ' + s.name; }).join(', ') + '.');
    }
    function hits(q) {
      var j = 0;
      STY.forEach(function (s) {
        s.bricks.forEach(function (b) {
          var on = +b.dataset.w === q;
          if (on) b.style.setProperty('--j', j++);
          b.classList.toggle('hit', on);
        });
      });
    }
    ap(side, hint, pl, rowsUl); ap(host, art, side);
    host.classList.add('c1');
    var cap = h('figcaption', 'cap');
    cap.innerHTML = '<b>Fig. 1.</b> Each brick is one word said, in reading order, on Ṛgveda 1.1.1 (8 words). Pada is the top course and ghana the bottom. Limit: one line only, from the pattern formulas in our research file, with no special end-of-line rules that reciters use. “Checksum” is our comparison, not a claim that reciters were computing.';
    host.appendChild(cap);
    btns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    STY.forEach(function (s) { var c = count(s, DEF); cells[s.k].textContent = String(c); cells[s.k]._v = c; });
    pressOnly(btns, btns[DEF]);
    P.inView(art, function () {
      svg.classList.add('is-in');
      Object.keys(cells).forEach(function (k) { cells[k]._v = 0; });
      STY.forEach(function (s) { P.roll(cells[s.k], count(s, cur), function (x) { return String(Math.round(x)); }); });
      if (P.rm() || !svg.animate) { built = true; hits(cur); return; }
      STY.forEach(function (s) { s.bricks.forEach(function (b) {
        b.animate([{ opacity: 0, transform: 'translateY(-30px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 520, delay: b._o * 11, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      }); });
      setTimeout(function () { built = true; hits(cur); }, order * 11 + 560);
    }, { threshold: 0.25 });
  })();

  /* ------------------------------------------------ Fig. 3: Mūladevīya (section 7) */
  (function () {
    var host = $('fig-3'), T = IKS.logic && IKS.logic.cipher; if (!host || !T) return;
    var DEFAULT = 'agnim īḷe purohitam yajñasya devam ṛtvijam hotāram ratnadhātamam';
    var lab = h('label', 'hint', 'Type in IAST. A = ā, S = ś, T = ṭ also work.'); lab.setAttribute('for', 'c3-in');
    var inp = h('input', 'c3-in'); inp.id = 'c3-in'; inp.type = 'text'; inp.maxLength = 160; inp.value = DEFAULT; inp.setAttribute('autocomplete', 'off'); inp.setAttribute('spellcheck', 'false'); inp.setAttribute('lang', 'sa');
    var badge = h('span', 'verify', 'Table to verify against Kahn p.74 / Ganguly pp.167–170');
    var tiles = h('div', 'c3-tiles'); tiles.setAttribute('aria-hidden', 'true');
    var read = h('div', 'c3-read'), num = h('span', 'big', '0%'), sub = h('small'), out = h('p', 'c3-out');
    var u = h('b', null, '0'), t = h('b', null, '0');
    ap(read, num, sub); ap(host, lab, inp, h('div', 'c3-badge', ''), tiles, read, out);
    host.querySelector('.c3-badge').appendChild(badge);
    var cap = h('figcaption', 'cap'); cap.innerHTML = '<b>Fig. 3.</b> The Mūladevīya table swaps 20 letters in pairs and leaves every other letter as it is. This is one line only, from Ṛgveda 1.1.1, and the table is not yet verified.';
    host.appendChild(cap);
    var seen = false, tm, lastKey = '';
    function pct(x) { return Math.round(x) + '%'; }
    function run(animate) {
      var text = inp.value, tk = T.tokenize(text), sw = [], k = 0, letters = 0, same = 0, i;
      tiles.textContent = '';
      for (i = 0; i < tk.length; i++) {
        var tok = tk[i], isL = /[A-Za-zÀ-ɏḀ-ỿ]/.test(tok), tl;
        if (/^\s$/.test(tok)) { tiles.appendChild(h('span', 'tl-sp')); continue; }
        var p = Object.prototype.hasOwnProperty.call(T.TABLE, tok) ? T.TABLE[tok] : null;
        if (isL) letters++;
        tl = h('span', 'tl' + (p ? ' is-sw' : ''));
        var inn = h('span', 'tl-in'); inn.appendChild(h('span', 'tl-f', tok));
        if (p) { inn.appendChild(h('span', 'tl-b', p)); tl.style.setProperty('--i', k++); sw.push(tl); } else if (isL) same++;
        tl.appendChild(inn); tiles.appendChild(tl);
      }
      var value = letters ? same / letters * 100 : 0;
      out.textContent = letters ? 'Cipher text: ' + T.encryptIAST(text) : '';
      sub.textContent = '';
      if (!letters) { num.textContent = '–'; num._v = 0; sub.textContent = 'Type some letters.'; return; }
      ap(sub, u, doc.createTextNode(' of '), t, doc.createTextNode(' letters unchanged'));
      var key = text; var changed = key !== lastKey; lastKey = key;
      if (animate && changed) { P.roll(num, value, pct); P.roll(u, same, function (x) { return String(Math.round(x)); }); }
      else { num.textContent = pct(value); num._v = value; u.textContent = String(same); u._v = same; }
      t.textContent = String(letters);
      var flipIt = function () { sw.forEach(function (x) { x.classList.add('is-flip'); }); };
      if (P.rm() || !seen) { if (P.rm()) flipIt(); } else { requestAnimationFrame(function () { requestAnimationFrame(flipIt); }); }
      if (animate && changed && seen) say(pct(value) + ': ' + same + ' of ' + letters + ' letters unchanged.');
    }
    run(false);
    inp.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(function () { run(true); }, 150); });
    P.inView(tiles, function () {
      seen = true; host.classList.add('is-in');
      num._v = 0; u._v = 0;
      lastKey = ''; run(true);
    }, { threshold: 0.2 });
  })();

  /* ------------------------------------------------ Fig. 5: Katapayadi (section 7) */
  (function () {
    var host = $('fig-5'); if (!host) return;
    /* the rules and table, ported from the earlier demo (logic and data only) */
    var map2 = { kh: 2, gh: 4, ch: 7, jh: 9, Th: 2, Dh: 4, th: 7, dh: 9, ph: 2, bh: 4 };
    var map1 = { k: 1, g: 3, G: 5, c: 6, j: 8, J: 0, T: 1, D: 3, N: 5, t: 6, d: 8, n: 0, p: 1, b: 3, m: 5, y: 1, r: 2, l: 3, v: 4, S: 5, z: 6, s: 7, h: 8 };
    var show = { G: 'ṅ', J: 'ñ', T: 'ṭ', D: 'ḍ', N: 'ṇ', S: 'ś', z: 'ṣ', Th: 'ṭh', Dh: 'ḍh' };
    var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
    function parse(word) {
      var out = [], cl = [], i = 0;
      function flush() { if (cl.length) { out.push({ letters: cl.map(function (c) { return show[c.s] || c.s; }), digit: cl[cl.length - 1].d }); cl = []; } }
      word = String(word || '');
      while (i < word.length) {
        var two = word.substr(i, 2);
        if (has(map2, two)) { cl.push({ s: two, d: map2[two] }); i += 2; continue; }
        var ch = word.charAt(i);
        if (has(map1, ch)) cl.push({ s: ch, d: map1[ch] }); else flush();
        i++;
      }
      flush(); return out;
    }
    function toNumber(word) { var parts = parse(word), order = parts.map(function (p) { return p.digit; }); return { parts: parts, order: order, number: order.slice().reverse().join('') }; }
    var KP = { parse: parse, toNumber: toNumber }; IKS.logic = IKS.logic || {}; if (!IKS.logic.katapayadi) IKS.logic.katapayadi = KP;
    var TABLE = [['ka 1', 'kha 2', 'ga 3', 'gha 4', 'ṅa 5', 'ca 6', 'cha 7', 'ja 8', 'jha 9', 'ña 0'], ['ṭa 1', 'ṭha 2', 'ḍa 3', 'ḍha 4', 'ṇa 5', 'ta 6', 'tha 7', 'da 8', 'dha 9', 'na 0'], ['pa 1', 'pha 2', 'ba 3', 'bha 4', 'ma 5'], ['ya 1', 'ra 2', 'la 3', 'va 4', 'śa 5', 'ṣa 6', 'sa 7', 'ha 8']];
    var EX = ['kam', 'gita', 'ananda', 'ram'];

    var lab = h('label', 'hint', 'Type a word in plain letters. S = ś, z = ṣ, N = ṇ, T = ṭ.'); lab.setAttribute('for', 'k5-in');
    var inp = h('input', 'c3-in'); inp.id = 'k5-in'; inp.type = 'text'; inp.value = 'kam'; inp.maxLength = 40;
    inp.setAttribute('autocomplete', 'off'); inp.setAttribute('autocapitalize', 'off'); inp.setAttribute('spellcheck', 'false');
    var ex = h('div', 'plaques k5-ex'), exb = [];
    EX.forEach(function (w) { var b = h('button', 'plq', w); b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', function () { inp.value = w; run(true); say(w + ' is ' + toNumber(w).number); }); ex.appendChild(b); exb.push(b); });
    var slots = h('div', 'k5-slots'), plate = h('div', 'k5-plate'), num = h('output', 'big k5-num'), way = h('span', 'k5-way', '← read this way'), steps = h('p', 'k5-steps');
    num.setAttribute('for', 'k5-in'); ap(plate, num, way);
    var det = h('details', 'own'), sm = h('summary', null, 'The table'), tbl = h('div', 'k5-table'); ap(det, sm, tbl);
    TABLE.forEach(function (row) { var r = h('div', 'k5-row'); row.forEach(function (c) { var b = c.split(' '); var cell = h('span', 'k5-cell'); ap(cell, h('span', null, b[0]), h('b', null, b[1])); r.appendChild(cell); }); tbl.appendChild(r); });
    ap(host, lab, inp, ex, slots, plate, steps, det);
    var cap = h('figcaption', 'cap'); cap.innerHTML = '<b>Fig. 5.</b> Each consonant stands for a digit. Vowels count for nothing, and in a cluster only the last consonant counts. Anyone with the table can read it. It was built for memory, not to hide information <a class="cite" href="#ref-8">[8]</a>.';
    host.appendChild(cap);
    var seen = false, last = null;
    function run(animate) {
      var r = toNumber(inp.value); exb.forEach(function (b, k) { b.setAttribute('aria-pressed', String(EX[k] === inp.value)); });
      slots.textContent = '';
      r.parts.forEach(function (p, k) {
        var s = h('span', 'k5-slot'); s.style.setProperty('--i', k);
        ap(s, h('span', 'k5-l', p.letters.join('+')), h('b', 'k5-d', String(p.digit))); slots.appendChild(s);
      });
      if (!r.parts.length) { num.textContent = '–'; num._v = 0; steps.textContent = 'Type a word with at least one consonant.'; last = null; return; }
      steps.textContent = 'Digits in order: ' + r.order.join(' ') + '. Read right to left: ' + r.number + '.';
      var len = r.number.length, s = r.number;
      if (animate && seen && len <= 12 && s !== last) {
        var to = parseInt(s, 10);
        P.roll(num, to, function (x) { var t = String(Math.round(x)); while (t.length < len) t = '0' + t; return t; });
        setTimeout(function () { if (inp.value && toNumber(inp.value).number === s) num.textContent = s; }, 1000);
      } else { num.textContent = s; num._v = parseInt(s, 10); }
      last = s;
    }
    run(false);
    var tm; inp.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(function () { run(true); var n = toNumber(inp.value); if (n.parts.length) say(inp.value + ' is ' + n.number); }, 150); });
    P.inView(slots, function () { seen = true; host.classList.add('is-in'); last = null; num._v = 0; run(true); }, { threshold: 0.25 });
  })();

  /* ------------------------------------------------ Fig. 6: RSA (section 7) */
  (function () {
    var host = $('fig-6'), R = IKS.logic && IKS.logic.rsa; if (!host || !R || typeof BigInt === 'undefined') return;
    var PAIRS = [[11, 13], [17, 19], [53, 59]], M = 42, E = 7;

    /* 2.5D courier lanes: a table by road, a lock by road */
    function plinth(parent, x, y, col) {
      var g = sv('g', { transform: 'translate(' + x + ' ' + y + ')' }, parent);
      IKS.iso.brick(g, -1.5, -1.5, 0, 3, 3, 0.9, 8, { t: '#D9794A', l: '#8C3B22', r: '#AE5230' });
      return g;
    }
    function person(parent, x, y, cls, label) {
      var g = sv('g', { transform: 'translate(' + x + ' ' + y + ')' }, parent);
      sv('ellipse', { cx: 0, cy: 8, rx: 15, ry: 5, class: 'c6-sd' }, g);
      sv('path', { d: 'M-10 6 L-7 -18 C-6 -26 6 -26 7 -18 L10 6Z', class: cls }, g);
      sv('circle', { cx: 0, cy: -29, r: 7.5, class: 'c6-hd' }, g);
      sv('path', { d: 'M-7.5 -30 C-7 -40 7 -40 7.5 -30 C4 -34 -4 -34 -7.5 -30Z', class: 'c6-hr' }, g);
      var t = sv('text', { x: 0, y: 40, 'text-anchor': 'middle', class: 'c6-t' }, g); t.textContent = label;
      return g;
    }
    function lockIcon(parent, open, cls) {
      var g = sv('g', { class: cls || '' }, parent);
      sv('path', { d: open ? 'M-5 -3 V-8 a5 5 0 0 1 10 0' : 'M-5 -3 V-8 a5 5 0 0 1 10 0 V-3', class: 'c6-sh' }, g);
      sv('rect', { x: -8, y: -3, width: 16, height: 12, rx: 2.5, class: 'c6-lb' }, g);
      sv('circle', { cx: 0, cy: 3, r: 1.8, class: 'c6-kh' }, g);
      return g;
    }
    function lane(kind) {
      var s = sv('svg', { viewBox: '0 0 360 140', class: 'c6-lane c6-' + kind, role: 'img', 'aria-label': kind === 'old' ? 'The old way: a table is carried by courier, and a spy copies it on the road.' : 'The RSA way: an open lock is shared, and only the private key at home opens the locked box.', focusable: 'false' });
      sv('path', { d: 'M40 84 L320 84 L346 114 L14 114Z', class: 'c6-road' }, s);
      sv('path', { class: 'c6-dash', d: 'M30 99 L330 99' }, s);
      plinth(s, 36, 100); plinth(s, 324, 100);
      person(s, 36, 87, 'c6-pe', 'Sender'); person(s, 324, 87, 'c6-ne', 'Receiver');
      /* the spy, hooded, above the middle of the road */
      var sp = sv('g', { transform: 'translate(180 56)' }, s);
      sv('path', { d: 'M-12 18 C-12 -2 -6 -14 0 -16 C6 -14 12 -2 12 18Z', class: 'c6-ma' }, sp);
      sv('ellipse', { cx: 0, cy: -4, rx: 5.5, ry: 3.4, class: 'c6-hr' }, sp);
      sv('circle', { cx: -2, cy: -4, r: 1, class: 'c6-ey' }, sp); sv('circle', { cx: 2, cy: -4, r: 1, class: 'c6-ey' }, sp);
      var st = sv('text', { x: 0, y: -22, 'text-anchor': 'middle', class: 'c6-t' }, sp); st.textContent = 'Spy';
      if (kind === 'old') {
        var a = sv('g', { transform: 'translate(36 74)' }, s), mv = sv('g', { class: 'c6-m c6-tab' }, a);
        sv('rect', { x: -17, y: -11, width: 34, height: 22, rx: 3, class: 'c6-card' }, mv);
        var tt = sv('text', { x: 0, y: 4, 'text-anchor': 'middle', class: 'c6-tk' }, mv); tt.textContent = 'a↔k';
        var b = sv('g', { transform: 'translate(180 74)' }, s), cp = sv('g', { class: 'c6-m c6-copy' }, b);
        sv('rect', { x: -17, y: -11, width: 34, height: 22, rx: 3, class: 'c6-cp' }, cp);
        var t2 = sv('text', { x: 0, y: 4, 'text-anchor': 'middle', class: 'c6-tk' }, cp); t2.textContent = 'a↔k';
      } else {
        var kk = sv('g', { transform: 'translate(300 60)' }, s), key = sv('g', { class: 'c6-m c6-key' }, kk);
        sv('circle', { cx: 0, cy: 0, r: 6, class: 'c6-ky' }, key);
        sv('path', { d: 'M6 0 H22 M16 0 V6 M21 0 V5', class: 'c6-ky' }, key);
        var l1 = sv('g', { transform: 'translate(306 74)' }, s), m1 = sv('g', { class: 'c6-m c6-lock' }, l1); lockIcon(m1, true);
        var l2 = sv('g', { transform: 'translate(180 74)' }, s), m2 = sv('g', { class: 'c6-m c6-lock2' }, l2); lockIcon(m2, true);
        var bx = sv('g', { transform: 'translate(66 74)' }, s), m3 = sv('g', { class: 'c6-m c6-box' }, bx);
        sv('rect', { x: -15, y: -9, width: 30, height: 20, rx: 3, class: 'c6-bx' }, m3);
        lockIcon(m3, false, 'c6-shut'); lockIcon(m3, true, 'c6-ajar');
        var q = sv('text', { x: 180, y: 40, 'text-anchor': 'middle', class: 'c6-q' }, s); q.textContent = '?';
      }
      return s;
    }
    var lanes = h('div', 'c6-lanes'), la = h('div', 'c6-lanewrap'), lb = h('div', 'c6-lanewrap');
    var ha = h('p', 'c6-h'); ap(ha, h('b', null, 'The old way. '), doc.createTextNode('A table goes by courier and is copied on the road.'));
    var hb = h('p', 'c6-h'); ap(hb, h('b', null, 'RSA. '), doc.createTextNode('An open lock is public. Only the private key opens it.'));
    ap(la, ha, lane('old')); ap(lb, hb, lane('rsa')); ap(lanes, la, lb);

    /* the control and the live result */
    var hint = h('p', 'hint', 'Choose two small primes.'), pl = h('div', 'plaques'), btns = [];
    PAIRS.forEach(function (pq) { var b = h('button', 'plq', pq[0] + ' × ' + pq[1]); b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', function () { show(pq, true, true); }); pl.appendChild(b); btns.push(b); });
    function cell(lab) { var c = h('div', 'c6-cell'), v = h('span', 'big', '0'), f = h('small'); c.appendChild(h('small', 'c6-lab', lab)); ap(c, v, f); return { el: c, v: v, f: f }; }
    var cm = cell('The number'), cc = cell('Locked'), cu = cell('Unlocked');
    function arrow(t) { var a = h('div', 'c6-ar'); a.appendChild(h('span', null, t)); a.appendChild(h('i')); return a; }
    var arLock = arrow('lock with the public key'), arOpen = arrow('open with the private key');
    var flow = h('div', 'c6-flow'); ap(flow, cm.el, arLock, cc.el, arOpen, cu.el);
    var pub = h('p', 'c6-pub'), priv = h('p', 'c6-priv'), ok = h('p', 'c6-ok');
    var keys = h('div', 'c6-keys'); ap(keys, pub, priv);
    ap(host, lanes, hint, pl, flow, keys, ok);
    var cap = h('figcaption', 'cap'); cap.innerHTML = '<b>Fig. 6.</b> The primes are small on purpose, so you can follow the maths. This is not secure: real RSA keys are about 2048 bits long. RSA is from 1977 <a class="cite" href="#ref-15">[15]</a>.';
    host.appendChild(cap);

    var seen = false, uT, cur = PAIRS[0];
    var fmt = function (x) { return String(Math.round(x)); };
    function show(pq, announce, animate) {
      cur = pq; pressOnly(btns, btns[PAIRS.indexOf(pq)]);
      var k = R.keygen(pq[0], pq[1], E), c = R.encrypt(M, k.pub), u = R.decrypt(c, k.priv), good = u === BigInt(M);
      pub.textContent = ''; ap(pub, h('small', null, 'Public key, shared openly'), h('b', null, 'n = ' + k.n + ', e = ' + k.e));
      priv.textContent = ''; ap(priv, h('small', null, 'Private key, never sent'), h('b', null, 'd = ' + k.d));
      cm.f.textContent = ''; cc.f.innerHTML = M + '<sup>' + k.e + '</sup> mod ' + k.n; cu.f.innerHTML = c + '<sup>' + k.d + '</sup> mod ' + k.n;
      ok.textContent = good ? 'Unlocked ' + u + ' is the same as the number we locked. The private key stayed with the receiver.' : 'The numbers do not match.';
      clearTimeout(uT);
      if (animate) {
        cm.v.textContent = String(M); cm.v._v = M;
        P.roll(cc.v, Number(c), fmt);
        cu.v.textContent = '0'; cu.v._v = 0;
        uT = setTimeout(function () { P.roll(cu.v, Number(u), fmt); }, P.rm() ? 0 : 950);
      } else { cm.v.textContent = String(M); cm.v._v = M; cc.v.textContent = String(c); cc.v._v = Number(c); cu.v.textContent = String(u); cu.v._v = Number(u); }
      if (announce) say('Primes ' + pq[0] + ' and ' + pq[1] + '. Public key n ' + k.n + ', e ' + k.e + '. ' + M + ' locks to ' + c + ' and unlocks to ' + u + '. The private key was not sent.');
    }
    show(PAIRS[0], false, false);
    P.inView(lanes, function () {
      seen = true; host.classList.add('is-in');
      cc.v._v = 0; cu.v._v = 0; show(cur, false, true);
      if (P.rm()) return;
      lanes.classList.add('is-live');
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { lanes.classList.toggle('is-live', es[0].isIntersecting); }).observe(lanes);
    }, { threshold: 0.25 });
  })();
})();
