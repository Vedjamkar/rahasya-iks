/**
 * Rahasya L7 "Pivot to RSA" (id: rsa)
 * Pure logic first (BigInt, exact, runs in node), then the UI (browser only).
 * Textbook RSA with tiny numbers. Never secure; it is here to be understood.
 */
(function () {
  'use strict';

  /* =================================================================== logic */
  function B(x) { return typeof x === 'bigint' ? x : BigInt(x); }
  function N(x) { return Number(x); }

  var L = {};

  L.isqrt = function (n) {
    n = B(n);
    if (n < 0n) throw new RangeError('isqrt of negative');
    if (n < 2n) return n;
    var x;
    if (n > 2n ** 52n) x = 1n << BigInt((n.toString(2).length >> 1) + 1);
    else x = BigInt(Math.floor(Math.sqrt(Number(n))));
    for (;;) {
      var y = (x + n / x) >> 1n;
      if (y >= x) break;
      x = y;
    }
    while (x * x > n) x -= 1n;
    while ((x + 1n) * (x + 1n) <= n) x += 1n;
    return x;
  };

  L.isPrime = function (n) {
    n = B(n);
    if (n < 2n) return false;
    if (n < 4n) return true;
    if (n % 2n === 0n || n % 3n === 0n) return false;
    var r = L.isqrt(n);
    for (var f = 5n; f <= r; f += 6n) {
      if (n % f === 0n || n % (f + 2n) === 0n) return false;
    }
    return true;
  };

  L.gcd = function (a, b) {
    a = B(a); b = B(b);
    if (a < 0n) a = -a;
    if (b < 0n) b = -b;
    while (b) { var t = a % b; a = b; b = t; }
    return a;
  };

  /** Extended Euclid: returns {g, x, y} with a*x + b*y = g. */
  L.egcd = function (a, b) {
    a = B(a); b = B(b);
    var r0 = a, r1 = b, s0 = 1n, s1 = 0n, t0 = 0n, t1 = 1n;
    while (r1 !== 0n) {
      var q = r0 / r1, r2 = r0 - q * r1;
      r0 = r1; r1 = r2;
      var s2 = s0 - q * s1; s0 = s1; s1 = s2;
      var t2 = t0 - q * t1; t0 = t1; t1 = t2;
    }
    return { g: r0, x: s0, y: t0 };
  };

  /** Rows of the Euclid division table for gcd(a, b): a = q*b + r. */
  L.euclidRows = function (a, b) {
    a = B(a); b = B(b);
    var rows = [];
    while (b !== 0n) {
      var q = a / b, r = a % b;
      rows.push({ a: a, b: b, q: q, r: r });
      a = b; b = r;
    }
    return rows;
  };

  L.modInverse = function (a, m) {
    a = B(a); m = B(m);
    if (m <= 1n) throw new RangeError('modulus must be > 1');
    var e = L.egcd(((a % m) + m) % m, m);
    if (e.g !== 1n) throw new RangeError('no inverse: gcd(' + a + ', ' + m + ') = ' + e.g);
    return ((e.x % m) + m) % m;
  };

  L.modPow = function (base, exp, mod) {
    base = B(base); exp = B(exp); mod = B(mod);
    if (mod <= 0n) throw new RangeError('bad modulus');
    if (exp < 0n) throw new RangeError('negative exponent');
    var result = 1n % mod;
    base = ((base % mod) + mod) % mod;
    while (exp > 0n) {
      if (exp & 1n) result = (result * base) % mod;
      base = (base * base) % mod;
      exp >>= 1n;
    }
    return result;
  };

  /**
   * Left-to-right square-and-multiply, with every step recorded for the animation.
   * bits: binary digits of exp (most significant first, as chars '0'/'1').
   * steps: {k, bit, op: 'start'|'square'|'multiply', before, after}  (k = bit index)
   */
  L.modPowSteps = function (base, exp, mod) {
    base = B(base); exp = B(exp); mod = B(mod);
    if (exp < 1n) throw new RangeError('exponent must be >= 1');
    var b = ((base % mod) + mod) % mod;
    var bits = exp.toString(2).split('');
    var steps = [];
    var v = b;
    steps.push({ k: 0, bit: 1, op: 'start', before: 1n, after: v });
    for (var k = 1; k < bits.length; k++) {
      var bit = bits[k] === '1' ? 1 : 0;
      var sq = (v * v) % mod;
      steps.push({ k: k, bit: bit, op: 'square', before: v, after: sq });
      v = sq;
      if (bit) {
        var mu = (v * b) % mod;
        steps.push({ k: k, bit: bit, op: 'multiply', before: v, after: mu });
        v = mu;
      }
    }
    return { result: v, bits: bits, steps: steps };
  };

  /** lambda = lcm(p-1, q-1) */
  L.carmichael = function (p, q) {
    p = B(p); q = B(q);
    var a = p - 1n, b = q - 1n;
    return (a / L.gcd(a, b)) * b;
  };

  /**
   * e is "weak" for the game when e*e = 1 (mod lambda): then the public key would also
   * unlock, and the one-way twist would not show. We hide such chips.
   */
  L.weakE = function (p, q, e) {
    var lam = L.carmichael(p, q);
    return (B(e) * B(e)) % lam === 1n;
  };

  /** Chips for e: why each is valid or not. */
  var E_CHIPS = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25];
  L.eChips = function (p, q) {
    var phi = (B(p) - 1n) * (B(q) - 1n);
    var out = [];
    E_CHIPS.forEach(function (e) {
      var E = BigInt(e);
      if (E >= phi) return;
      if (L.weakE(p, q, E)) return;
      var g = L.gcd(E, phi);
      out.push({ e: e, g: g, ok: g === 1n });
    });
    return out;
  };

  L.keygen = function (p, q, e) {
    p = B(p); q = B(q); e = B(e);
    if (!L.isPrime(p) || !L.isPrime(q)) throw new RangeError('p and q must be prime');
    if (p === q) throw new RangeError('p and q must differ');
    var n = p * q, phi = (p - 1n) * (q - 1n);
    if (n <= 26n) throw new RangeError('n must exceed 26');
    if (e <= 1n || e >= phi) throw new RangeError('e out of range');
    if (L.gcd(e, phi) !== 1n) throw new RangeError('e must be coprime to phi');
    var d = L.modInverse(e, phi);
    return { p: p, q: q, n: n, phi: phi, e: e, d: d, pub: { n: n, e: e }, priv: { n: n, d: d } };
  };

  L.encrypt = function (m, pub) {
    m = B(m);
    if (m < 0n || m >= B(pub.n)) throw new RangeError('message must be < n');
    return L.modPow(m, pub.e, pub.n);
  };
  L.decrypt = function (c, priv) {
    c = B(c);
    if (c < 0n || c >= B(priv.n)) throw new RangeError('ciphertext must be < n');
    return L.modPow(c, priv.d, priv.n);
  };

  /** Smallest factor split by trial division. Returns [p, q] (BigInt, ascending), or null if n is prime or < 4. */
  L.factorSmall = function (n) {
    n = B(n);
    if (n < 4n) return null;
    if (n % 2n === 0n) return [2n, n / 2n];
    var r = L.isqrt(n);
    for (var f = 3n; f <= r; f += 2n) if (n % f === 0n) return [f, n / f];
    return null;
  };

  L.primesUpTo = function (n) {
    var out = [];
    for (var i = 2; i <= n; i++) if (L.isPrime(i)) out.push(i);
    return out;
  };

  /* A=1 ... Z=26 */
  L.textToNums = function (s) {
    var out = [];
    String(s).toUpperCase().split('').forEach(function (ch) {
      var c = ch.charCodeAt(0);
      if (c >= 65 && c <= 90) out.push(c - 64);
    });
    return out;
  };
  L.numsToText = function (nums) {
    return nums.map(function (x) {
      x = N(x);
      return x >= 1 && x <= 26 ? String.fromCharCode(64 + x) : '?';
    }).join('');
  };

  /**
   * The modular clock: after k steps the hand is at (k*e) mod phi, having gone round `laps` times.
   * jump(state, by): advances by up to `by` steps but stops ON 1 if it passes through it.
   */
  L.clockAt = function (e, phi, k) {
    var tot = B(e) * BigInt(k), P = B(phi);
    return { k: k, pos: N(tot % P), laps: N(tot / P) };
  };
  L.clockJump = function (e, phi, k, by) {
    for (var i = 1; i <= by; i++) {
      var s = L.clockAt(e, phi, k + i);
      if (s.pos === 1) return { k: k + i, hit: true, pos: 1, laps: s.laps, stepsTaken: i };
    }
    var t = L.clockAt(e, phi, k + by);
    return { k: k + by, hit: false, pos: t.pos, laps: t.laps, stepsTaken: by };
  };
  /** The lap trick: e*d = 1 + j*phi. Rows for j = 1..e-1; `whole` marks the j that works. */
  L.lapRows = function (e, phi) {
    e = B(e); phi = B(phi);
    var rows = [];
    for (var j = 1n; j < e; j++) {
      var tot = 1n + j * phi;
      var whole = tot % e === 0n;
      rows.push({ j: N(j), total: tot, rem: N(tot % e), whole: whole, d: whole ? tot / e : null });
      if (whole) break;
    }
    return rows;
  };

  /** Seeded 2048-bit number (top bit set, odd) for the "real size" reveal. NOT claimed to be a product of two primes. */
  L.bigNumber2048 = function () {
    var s = 0x9E3779B9 >>> 0, x = 0n;
    for (var i = 0; i < 64; i++) {
      s = (Math.imul(s ^ (s >>> 15), 0x2C1B3C6D) + 0x297A2D39) >>> 0;
      s ^= s >>> 12; s = Math.imul(s, 0x85EBCA6B) >>> 0; s ^= s >>> 13;
      x = (x << 32n) | BigInt(s >>> 0);
    }
    x |= 1n << 2047n;
    x |= 1n;
    x &= (1n << 2048n) - 1n;
    return x;
  };

  /** The attacker puzzle, fixed. */
  L.ATTACK = (function () {
    var n = 3233n, e = 17n, word = 'GOLD';
    var cipher = L.textToNums(word).map(function (m) { return L.encrypt(m, { n: n, e: e }); });
    return { n: n, e: e, word: word, cipher: cipher };
  })();

  L.finalStars = function (wrongs) {
    return Math.max(1, Math.min(3, Math.round(3 - wrongs / 3)));
  };

  /* ---- exports ---- */
  if (typeof module !== 'undefined') module.exports = L;
  if (typeof window === 'undefined') return;
  window.IKS = window.IKS || {};
  window.IKS.logic = window.IKS.logic || {};
  window.IKS.logic.rsa = L;

  /* ===================================================================== UI */
  var IKS = window.IKS;
  if (!IKS || !IKS.registerLevel) return;
  var h = IKS.el;
  var SKIN = '#C58B5A', NAVY = '#0B0B22';
  var SOURCES = [
    { text: 'Rivest, Shamir & Adleman, "A Method for Obtaining Digital Signatures and Public-Key Cryptosystems", *Communications of the ACM* 21(2), 1978, pp. 120–126', tier: 'R', url: 'https://doi.org/10.1145/359340.359342' }
  ];

  function s(x) { return String(x); }
  function devaNum(n) { return String(n).replace(/\d/g, function (d) { return '०१२३४५६७८९'.charAt(+d); }); }
  function svgEl(tag, attrs) {
    var a = arguments.length > 2 ? Array.prototype.slice.call(arguments, 2) : [];
    return h.apply(null, [tag, attrs].concat(a));
  }

  /* ------------------------------------------------------------- figures */
  function figArya() {
    return svgEl('g', { class: 'fig' },
      svgEl('path', { d: 'M-31 0 C-27 -30 -21 -56 -16 -80 L16 -80 C21 -56 28 -30 33 0Z', fill: '#0F7A78' }),
      svgEl('path', { d: 'M-31 -7 H33', stroke: '#C9A227', 'stroke-width': 4, fill: 'none' }),
      svgEl('path', { d: 'M-14 -110 H14 L17 -78 H-17Z', fill: '#E2638E' }),
      svgEl('path', { d: 'M-14 -110 L-3 -110 L26 -40 L13 -40Z', fill: '#F2A20C' }),
      svgEl('path', { d: 'M-13 -104 L-24 -78 M13 -104 L22 -80', stroke: SKIN, 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' }),
      svgEl('rect', { x: -4, y: -119, width: 8, height: 10, fill: SKIN }),
      svgEl('circle', { cx: 0, cy: -128, r: 11, fill: SKIN }),
      svgEl('path', { d: 'M-12 -129 A12 12 0 0 1 12 -129 Q2 -135 -12 -129Z', fill: '#1A0F1F' }),
      svgEl('circle', { cx: -9, cy: -138, r: 6.5, fill: '#1A0F1F' }),
      svgEl('circle', { cx: 0, cy: -130, r: 1.5, fill: '#D23B2E' }));
  }
  function figBhanu() {
    return svgEl('g', { class: 'fig' },
      svgEl('path', { d: 'M-13 -44 H-1 L-2 -4 H-12Z M1 -44 H13 L12 -4 H2Z', fill: '#2D3A8C' }),
      svgEl('path', { d: 'M-14 -4 H-1 Q-1 3 -7 3 H-17Z M1 -4 H14 Q14 3 8 3 H-1Z', fill: '#F2A20C' }),
      svgEl('path', { d: 'M-17 -112 H17 L25 -44 H-25Z', fill: '#F4EEDC' }),
      svgEl('path', { d: 'M-17 -112 L10 -96 L12 -44', stroke: '#C9A227', 'stroke-width': 2, fill: 'none' }),
      svgEl('rect', { x: -25, y: -72, width: 50, height: 7, fill: '#D23B2E' }),
      svgEl('path', { d: 'M-16 -106 L-26 -80 M16 -106 L24 -84', stroke: SKIN, 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' }),
      svgEl('rect', { x: -4, y: -120, width: 8, height: 10, fill: SKIN }),
      svgEl('circle', { cx: 0, cy: -128, r: 11, fill: SKIN }),
      svgEl('path', { d: 'M-15 -131 Q-18 -153 0 -155 Q18 -153 15 -131 Q0 -138 -15 -131Z', fill: '#D23B2E' }),
      svgEl('path', { d: 'M-13 -140 Q0 -148 13 -140', stroke: '#C9A227', 'stroke-width': 2, fill: 'none' }),
      svgEl('circle', { cx: 0, cy: -146, r: 2.6, fill: '#F6D365' }));
  }
  function figSpy() {
    return svgEl('g', { class: 'fig fig-spy' },
      svgEl('path', { d: 'M-30 0 L-16 -98 Q0 -130 16 -98 L30 0Z', fill: '#06061A', stroke: '#5B5BC0', 'stroke-width': 1.5 }),
      svgEl('path', { d: 'M-10 -100 Q0 -114 10 -100 L8 -86 Q0 -80 -8 -86Z', fill: '#000' }),
      svgEl('path', { d: 'M-24 -12 H24', stroke: '#2D2D70', 'stroke-width': 2, fill: 'none' }),
      svgEl('ellipse', { class: 'eye', cx: -4, cy: -95, rx: 2.8, ry: 1.4, fill: '#F2A20C' }),
      svgEl('ellipse', { class: 'eye', cx: 4, cy: -95, rx: 2.8, ry: 1.4, fill: '#F2A20C' }));
  }
  function figCourier() {
    return svgEl('g', { class: 'fig' },
      svgEl('path', { d: 'M-11 -40 H-1 L-2 -4 H-10Z M1 -40 H11 L10 -4 H2Z', fill: '#F4EEDC' }),
      svgEl('path', { d: 'M-15 -100 H15 L21 -40 H-21Z', fill: '#B33A2E' }),
      svgEl('rect', { x: -21, y: -66, width: 42, height: 6, fill: '#F2A20C' }),
      svgEl('path', { d: 'M17 -96 L24 -64', stroke: SKIN, 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' }),
      svgEl('path', { d: 'M24 -150 V0', stroke: '#C9A227', 'stroke-width': 3, 'stroke-linecap': 'round' }),
      svgEl('rect', { x: -3, y: -108, width: 7, height: 9, fill: SKIN }),
      svgEl('circle', { cx: 0, cy: -116, r: 10, fill: SKIN }),
      svgEl('path', { d: 'M-13 -118 Q-15 -138 0 -140 Q15 -138 13 -118 Q0 -124 -13 -118Z', fill: '#E8A33D' }));
  }
  function tableCard(cls) {
    return svgEl('g', { class: 'tcard ' + (cls || '') },
      svgEl('rect', { x: -19, y: -26, width: 38, height: 50, rx: 5, fill: '#F6D365', stroke: '#B88B16', 'stroke-width': 2 }),
      svgEl('path', { d: 'M-12 -14 H12 M-12 -4 H12 M-12 6 H12 M0 -20 V16', stroke: '#8A6A12', 'stroke-width': 1.4, fill: 'none' }),
      svgEl('text', { x: -6, y: -9, 'text-anchor': 'middle', 'font-size': 7, fill: '#6B4F0A' }, 'a'),
      svgEl('text', { x: 6, y: -9, 'text-anchor': 'middle', 'font-size': 7, fill: '#6B4F0A' }, 'k'),
      svgEl('text', { x: -6, y: 1, 'text-anchor': 'middle', 'font-size': 7, fill: '#6B4F0A' }, 'g'),
      svgEl('text', { x: 6, y: 1, 'text-anchor': 'middle', 'font-size': 7, fill: '#6B4F0A' }, 'kh'));
  }

  /* ---------------------------------------------------------- the scene */
  var CAPTIONS = [
    'Arya has made a secret table. Bhanu must hold the very same one.',
    'So a courier carries it across town.',
    'At the gate the courier is stopped. The spy (gūḍhapuruṣa) is watching.',
    'The spy copies the table while the courier waits.',
    'Now every message they send, the spy reads. The secret had to travel, and travelling was the risk.'
  ];
  function buildScene(api) {
    var stars = [];
    for (var i = 0; i < 26; i++) {
      stars.push(svgEl('circle', { class: 'star', cx: 20 + ((i * 97) % 760), cy: 14 + ((i * 53) % 150), r: i % 5 === 0 ? 1.8 : 1.1, fill: '#F4EEDC', style: { 'animation-delay': (i % 7) * 0.7 + 's' } }));
    }
    var svg = svgEl('svg', { class: 'rsa-scene', viewBox: '0 0 800 400', role: 'img', 'aria-label': 'Night scene. Arya on the left and Bhanu on the right. A courier carrying the table is stopped at a gate. A spy beside the gate copies the table.' },
      svgEl('defs', null,
        svgEl('linearGradient', { id: 'rsaSky', x1: '0', y1: '0', x2: '0', y2: '1' },
          svgEl('stop', { offset: '0%', 'stop-color': '#0C0C26' }), svgEl('stop', { offset: '100%', 'stop-color': '#26266A' }))),
      svgEl('rect', { width: 800, height: 400, fill: 'url(#rsaSky)' }),
      svgEl('g', null, stars),
      svgEl('circle', { cx: 700, cy: 64, r: 30, fill: '#E9D79A' }),
      svgEl('circle', { cx: 712, cy: 56, r: 27, fill: '#1A1A4C' }),
      /* skyline: gopuram left, sikhara right */
      svgEl('g', { class: 'skyline', fill: '#1B1B4A' },
        svgEl('path', { d: 'M20 330 V250 H60 V214 H92 V184 H118 V158 H140 V184 H166 V214 H198 V250 H238 V330Z' }),
        svgEl('circle', { cx: 129, cy: 150, r: 6 }),
        svgEl('path', { d: 'M590 330 C578 270 578 222 612 160 C646 222 646 270 634 330Z' }),
        svgEl('circle', { cx: 612, cy: 152, r: 6 }),
        svgEl('path', { d: 'M650 330 C644 292 646 262 670 226 C694 262 696 292 690 330Z' })),
      svgEl('rect', { x: 0, y: 330, width: 800, height: 70, fill: NAVY }),
      svgEl('path', { d: 'M0 330 H800', stroke: '#C9A227', 'stroke-width': 2 }),
      svgEl('path', { d: 'M0 372 H800', stroke: '#C9A227', 'stroke-width': 1, 'stroke-dasharray': '2 10', opacity: 0.6 }),
      /* the gate */
      svgEl('g', { class: 'gate' },
        svgEl('rect', { x: 346, y: 186, width: 28, height: 144, fill: '#242462', stroke: '#C9A227', 'stroke-width': 2 }),
        svgEl('rect', { x: 426, y: 186, width: 28, height: 144, fill: '#242462', stroke: '#C9A227', 'stroke-width': 2 }),
        svgEl('path', { d: 'M340 190 A9 9 0 0 1 350 178 A13 13 0 0 1 376 164 A24 24 0 0 1 424 164 A13 13 0 0 1 450 178 A9 9 0 0 1 460 190 Z', fill: '#2D2D7A', stroke: '#C9A227', 'stroke-width': 2 }),
        svgEl('path', { d: 'M400 142 V132 M392 146 L386 138 M408 146 L414 138', stroke: '#F2A20C', 'stroke-width': 2, 'stroke-linecap': 'round' }),
        svgEl('path', { d: 'M374 198 V330 M388 198 V330 M402 198 V330 M416 198 V330 M426 198 V330', class: 'bars', stroke: '#C9A227', 'stroke-width': 2, opacity: 0.55 })),
      /* the spy, stepping out of the shadow at t3 */
      svgEl('g', { transform: 'translate(486 330)' }, svgEl('g', { class: 'spy' }, figSpy(),
        svgEl('path', { class: 'gaze', d: 'M-8 -95 L-96 -64 L-90 -40Z', fill: '#F2A20C' }))),
      svgEl('g', { transform: 'translate(486 330)', class: 'lab' },
        svgEl('text', { x: 0, y: 26, 'text-anchor': 'middle', 'font-size': 14, fill: '#F4EEDC' }, 'the spy'),
        svgEl('text', { x: 0, y: 44, 'text-anchor': 'middle', 'font-size': 13, fill: '#E9D79A', 'font-style': 'italic', class: 'deva' }, 'gūḍhapuruṣa')),
      /* copy of the table, arrives at the spy at t4 */
      svgEl('g', { transform: 'translate(486 250)' }, svgEl('g', { class: 'copy' }, tableCard('t-copy'))),
      /* Arya and Bhanu */
      svgEl('g', { transform: 'translate(104 330)' }, figArya(),
        svgEl('text', { x: 0, y: 26, 'text-anchor': 'middle', 'font-size': 15, fill: '#F4EEDC', 'font-weight': 600 }, 'Arya')),
      svgEl('g', { transform: 'translate(704 330)' }, figBhanu(),
        svgEl('text', { x: 0, y: 26, 'text-anchor': 'middle', 'font-size': 15, fill: '#F4EEDC', 'font-weight': 600 }, 'Bhanu')),
      svgEl('g', { transform: 'translate(150 244)' }, svgEl('g', { class: 'arya-table' }, tableCard('t-orig'))),
      /* courier */
      svgEl('g', { class: 'courier' }, svgEl('g', { class: 'walk' }, figCourier(),
        svgEl('g', { transform: 'translate(-24 -58) scale(.8)' }, tableCard('t-carry')))),
      /* the message that the spy can now read */
      svgEl('g', { class: 'letter' },
        svgEl('rect', { x: -15, y: -10, width: 30, height: 20, rx: 3, fill: '#F4EEDC', stroke: '#C9A227' }),
        svgEl('path', { d: 'M-15 -10 L0 3 L15 -10', fill: 'none', stroke: '#B88B16', 'stroke-width': 1.6 })),
      svgEl('g', { class: 'barrier' },
        svgEl('rect', { x: 316, y: 296, width: 6, height: 34, fill: '#F4EEDC' }),
        svgEl('rect', { x: 306, y: 289, width: 56, height: 8, rx: 2, fill: '#D23B2E' }),
        svgEl('path', { d: 'M318 289 L326 297 M332 289 L340 297 M346 289 L354 297', stroke: '#F4EEDC', 'stroke-width': 3 })));

    var caption = h('p', { class: 'rsa-caption', 'aria-live': 'polite' }, CAPTIONS[0]);
    var skipBtn = h('button', { type: 'button', class: 'btn btn-ghost on-dark btn-sm', 'data-skip': '1' }, 'Skip to the end');
    var replayBtn = h('button', { type: 'button', class: 'btn btn-ghost on-dark btn-sm', hidden: true, 'data-replay': '1' }, 'Replay');
    var token = 0, done = false, onDone = function () {};

    function show(n) {
      for (var i = 1; i <= 5; i++) svg.classList.toggle('sc-t' + i, i <= n);
      caption.textContent = CAPTIONS[Math.max(0, n - 1)];
    }
    function finish() { done = true; skipBtn.hidden = true; replayBtn.hidden = false; onDone(); }
    var DUR = [0, 1500, 2600, 2000, 1800, 2600];
    async function play() {
      var my = ++token; done = false; skipBtn.hidden = false; replayBtn.hidden = true;
      show(0); caption.textContent = CAPTIONS[0];
      await api.sleep(450);
      for (var i = 1; i <= 5; i++) {
        if (my !== token || !api.alive()) return;
        show(i);
        await api.sleep(DUR[i]);
      }
      if (my === token && api.alive()) finish();
    }
    skipBtn.addEventListener('click', function () { token++; show(5); finish(); });
    replayBtn.addEventListener('click', function () { play(); });
    return {
      svg: svg, caption: caption, controls: h('div', { class: 'row rsa-scene-ctl' }, skipBtn, replayBtn),
      play: play, setOnDone: function (f) { onDone = f; }, isDone: function () { return done; }
    };
  }

  /* ----------------------------------------------- square-and-multiply */
  function buildMachine(api) {
    var title = h('p', { class: 'rsa-mach-title' }, 'Square and multiply');
    var bitsBox = h('ol', { class: 'rsa-bits', 'aria-label': 'Binary digits of the exponent' });
    var op = h('p', { class: 'rsa-op', 'aria-live': 'off' }, 'Pick a letter and press Play.');
    var val = h('span', { class: 'rsa-mach-val' }, '–');
    var res = h('p', { class: 'rsa-mach-res', hidden: true });
    var playBtn = h('button', { type: 'button', class: 'btn btn-gold btn-sm', 'data-mach-play': '1' }, 'Play');
    var skipBtn = h('button', { type: 'button', class: 'btn btn-ghost on-dark btn-sm' }, 'Fast-forward');
    var node = h('div', { class: 'rsa-machine' }, title,
      h('div', { class: 'rsa-mach-grid' },
        h('div', null, h('p', { class: 'rsa-lab' }, 'Binary digits of the exponent'), bitsBox),
        h('div', { class: 'rsa-mach-v' }, h('p', { class: 'rsa-lab' }, 'Running value'), val)),
      op, res, h('div', { class: 'row' }, playBtn, skipBtn));
    var runId = 0, fast = false, last = null;
    skipBtn.addEventListener('click', function () { fast = true; });

    async function run(job) {
      /* job: {base, exp, mod, title, verb} */
      last = job;
      var my = ++runId; fast = false;
      var r = L.modPowSteps(job.base, job.exp, job.mod);
      title.textContent = job.title;
      bitsBox.textContent = '';
      r.bits.forEach(function (b, i) {
        bitsBox.appendChild(h('li', { class: 'rsa-bit', 'data-bit': b, 'data-i': i }, h('b', null, b), h('i', null, s(i + 1))));
      });
      res.hidden = true; val.textContent = '1';
      var pills = bitsBox.children, shown = 1, base = Number(job.base), mod = Number(job.mod);
      op.textContent = 'Read the digits left to right. 0 means: square. 1 means: square, then multiply by ' + job.base + '.';
      if (api.reducedMotion) {
        Array.prototype.forEach.call(pills, function (p) { p.classList.add('is-done'); });
        val.textContent = s(r.result);
      } else {
        for (var k = 0; k < r.steps.length; k++) {
          var st = r.steps[k];
          if (my !== runId || !api.alive()) return null;
          var pill = pills[st.k];
          Array.prototype.forEach.call(pills, function (p) { p.classList.remove('is-now'); });
          pill.classList.add('is-now');
          if (st.op === 'start') op.textContent = 'First digit is 1: start with the base, ' + job.base + '.';
          else if (st.op === 'square') op.textContent = 'Square: ' + st.before + '² mod ' + mod + ' = ' + st.after + '.';
          else op.textContent = 'This digit is 1, so multiply by ' + job.base + ': ' + st.before + ' × ' + job.base + ' mod ' + mod + ' = ' + st.after + '.';
          var ms = fast ? 0 : (job.ms || 460);
          if (ms) { await IKS.anim.roll(val, Number(st.before), Number(st.after), Math.min(ms * 0.8, 380)); await api.sleep(ms * 0.5); }
          else val.textContent = s(st.after);
          val.textContent = s(st.after);
          if (!pill.classList.contains('is-done') && (st.op !== 'square' || r.bits[st.k] === '0' || st.k === 0)) pill.classList.add('is-done');
          if (st.op === 'multiply') pill.classList.add('is-done');
        }
        Array.prototype.forEach.call(pills, function (p) { p.classList.remove('is-now'); p.classList.add('is-done'); });
      }
      if (my !== runId) return null;
      op.textContent = job.verb + ' ' + r.result + '.';
      res.hidden = false; res.textContent = job.base + '^' + job.exp + ' mod ' + mod + ' = ' + r.result;
      IKS.anim.pulse(val, 'rgba(242,162,12,.6)');
      return r.result;
    }
    playBtn.addEventListener('click', function () { if (last) run(last); });
    return { node: node, run: run, setIdle: function (t) { title.textContent = t; } };
  }

  /* ------------------------------------------------- the modular clock */
  function buildClock(api, e, phi, onHit) {
    var E = Number(e), PH = Number(phi);
    var ticks = [];
    for (var i = 0; i < 60; i++) {
      var a = i * 6 * Math.PI / 180, big5 = i % 5 === 0;
      var r1 = big5 ? 95 : 101, r2 = 106;
      ticks.push(svgEl('line', { x1: 130 + r1 * Math.sin(a), y1: 130 - r1 * Math.cos(a), x2: 130 + r2 * Math.sin(a), y2: 130 - r2 * Math.cos(a), stroke: big5 ? '#E9D79A' : '#7C79B8', 'stroke-width': big5 ? 2 : 1 }));
    }
    function label(frac, v) {
      var a = frac * 2 * Math.PI, x = 130 + 79 * Math.sin(a), y = 130 - 79 * Math.cos(a) + 3;
      return [svgEl('text', { x: x, y: y, 'text-anchor': 'middle', 'font-size': 10, fill: '#E9D79A' }, s(v)),
        svgEl('text', { class: 'dv', x: x, y: y + 11, 'text-anchor': 'middle', 'font-size': 9, fill: '#C9A227' }, devaNum(v))];
    }
    var labels = [label(0.25, Math.round(PH / 4)), label(0.5, Math.round(PH / 2)), label(0.75, Math.round(PH * 3 / 4))];
    /* lotus-petal inlays on the outer ring at the four quarters */
    var petals = [0, 90, 180, 270].map(function (deg) {
      var pd = 'M130 9 C124 3 124 -6 130 -12 C136 -6 136 3 130 9Z';
      return svgEl('g', { transform: 'rotate(' + deg + ' 130 130)', class: 'lotus-inlay' },
        svgEl('path', { d: pd, transform: 'translate(130 9) rotate(-40) scale(.8) translate(-130 -9)', fill: '#E9D79A', stroke: '#5E4609', 'stroke-width': 1 }),
        svgEl('path', { d: pd, transform: 'translate(130 9) rotate(40) scale(.8) translate(-130 -9)', fill: '#E9D79A', stroke: '#5E4609', 'stroke-width': 1 }),
        svgEl('path', { d: pd, fill: '#F6D365', stroke: '#5E4609', 'stroke-width': 1 }),
        svgEl('circle', { cx: 130, cy: 9, r: 2.6, fill: '#5E4609' }));
    });
    /* jaali rosette hub: eight petals, a ring of pierced dots, radiating spokes */
    var rosette = [];
    for (var k = 0; k < 8; k++) {
      rosette.push(svgEl('ellipse', { cx: 130, cy: 130 - 14, rx: 4.5, ry: 11, transform: 'rotate(' + (k * 45) + ' 130 130)', fill: 'none', stroke: '#C9A227', 'stroke-width': 1.2 }));
      var ka = (k * 45 + 22.5) * Math.PI / 180;
      rosette.push(svgEl('circle', { cx: 130 + 22 * Math.sin(ka), cy: 130 - 22 * Math.cos(ka), r: 1.8, fill: '#E9D79A' }));
      rosette.push(svgEl('line', { x1: 130 + 28 * Math.sin(ka), y1: 130 - 28 * Math.cos(ka), x2: 130 + 56 * Math.sin(ka), y2: 130 - 56 * Math.cos(ka), stroke: '#C9A227', 'stroke-width': .7, opacity: .35 }));
    }
    var hand = svgEl('g', { class: 'hand' },
      svgEl('path', { d: 'M130 152 l-4.5 -10 h9Z', fill: '#F2A20C' }),
      svgEl('line', { x1: 130, y1: 142, x2: 130, y2: 46, stroke: '#F2A20C', 'stroke-width': 3, 'stroke-linecap': 'round' }),
      svgEl('path', { d: 'M130 36 l6 9 l-6 9 l-6 -9Z', fill: '#F2A20C', stroke: '#FFF3C4', 'stroke-width': 1.5 }));
    var svg = svgEl('svg', { class: 'rsa-clock', viewBox: '0 0 260 260', style: 'overflow:visible', role: 'img', 'aria-label': 'A brass yantra clock with ' + PH + ' positions. The hand moves e = ' + E + ' places at every step. Land exactly on 1.' },
      svgEl('defs', null, svgEl('linearGradient', { id: 'rsaClkRing', x1: '0', y1: '0', x2: '1', y2: '1' },
        svgEl('stop', { offset: '0%', 'stop-color': '#F3DE8E' }), svgEl('stop', { offset: '50%', 'stop-color': '#C9A227' }), svgEl('stop', { offset: '100%', 'stop-color': '#8A6A12' }))),
      svgEl('circle', { cx: 130, cy: 130, r: 121, fill: 'none', stroke: 'url(#rsaClkRing)', 'stroke-width': 10 }),
      svgEl('circle', { cx: 130, cy: 130, r: 126.5, fill: 'none', stroke: '#5E4609', 'stroke-width': 1 }),
      svgEl('circle', { cx: 130, cy: 130, r: 115.5, fill: 'none', stroke: '#5E4609', 'stroke-width': 1 }),
      svgEl('circle', { class: 'face', cx: 130, cy: 130, r: 115, fill: '#13133A' }),
      svgEl('circle', { cx: 130, cy: 130, r: 111, fill: 'none', stroke: '#C9A227', 'stroke-width': .9 }),
      svgEl('circle', { cx: 130, cy: 130, r: 108.5, fill: 'none', stroke: '#E9D79A', 'stroke-width': 1.4, 'stroke-dasharray': '1 3.2', opacity: .75 }),
      svgEl('circle', { cx: 130, cy: 130, r: 66, fill: 'none', stroke: '#C9A227', 'stroke-width': .8, opacity: .45 }),
      svgEl('circle', { cx: 130, cy: 130, r: 44, fill: 'none', stroke: '#C9A227', 'stroke-width': .8, 'stroke-dasharray': '2 4', opacity: .5 }),
      ticks, labels, petals,
      svgEl('text', { x: 122, y: 61, 'text-anchor': 'end', 'font-size': 10, fill: '#E9D79A' }, '0 = ' + PH),
      svgEl('text', { class: 'dv', x: 122, y: 72, 'text-anchor': 'end', 'font-size': 9, fill: '#C9A227' }, devaNum(0) + ' = ' + devaNum(PH)),
      svgEl('circle', { cx: 130, cy: 130, r: 30, fill: '#0E0E2C', stroke: '#C9A227', 'stroke-width': 1.2 }),
      rosette,
      svgEl('g', { class: 'goal' },
        svgEl('path', { d: 'M133 20 l7 8 l-7 8 l-7 -8Z', fill: '#F2A20C' }),
        svgEl('text', { x: 146, y: 33, 'text-anchor': 'start', 'font-size': 10, fill: '#F6D365', 'font-weight': 600 }, 'goal: 1')),
      hand,
      svgEl('circle', { cx: 130, cy: 130, r: 9, fill: 'url(#rsaClkRing)', stroke: '#5E4609', 'stroke-width': 1 }),
      svgEl('circle', { cx: 130, cy: 130, r: 3, fill: '#13133A' }));

    var kEl = h('span', { class: 'rsa-bignum-s' }, '0');
    var eqEl = h('span', { class: 'mono' }, '0 × ' + E + ' = 0');
    var wrapEl = h('span', { class: 'mono' }, '0 = 0 × ' + PH + ' + 0');
    var posEl = h('span', { class: 'rsa-pos' }, '0');
    var trail = h('ol', { class: 'rsa-trail', 'aria-label': 'Recent landing spots' });
    var msg = h('p', { class: 'rsa-msg', role: 'status' }, 'The hand starts at 0. Each step moves it ' + E + ' places. Land it exactly on 1.');
    var lapBox = h('div', { class: 'rsa-lapbox', hidden: true });

    var k = 0, busy = false, solved = false;
    function btn(label, by, cls, attrs) {
      return h('button', { type: 'button', class: 'btn btn-sm ' + (cls || 'btn-gold'), 'data-jump': by, on: { click: function () { jump(by); } } }, label);
    }
    var b1 = btn('+1 step', 1), b10 = btn('Jump ×10', 10), b100 = btn('Jump ×100', 100);
    var resetBtn = h('button', { type: 'button', class: 'btn btn-ghost on-dark btn-sm', on: { click: reset } }, 'Back to 0');
    var lapBtn = h('button', { type: 'button', class: 'btn btn-ghost on-dark btn-sm', 'data-lap': '1', on: { click: showLaps } }, 'Hint: count the laps');
    var runBtn = h('button', { type: 'button', class: 'btn btn-ghost on-dark btn-sm', 'data-autorun': '1', on: { click: autorun } }, 'Let the clock run');
    var allBtns = [b1, b10, b100, resetBtn, runBtn];

    function paint(st, instant) {
      var ang = Number(BigInt(E) * BigInt(st.k) * 3600000n / BigInt(PH)) / 10000;
      hand.style.transitionDuration = instant ? '0s' : '';
      hand.style.transform = 'rotate(' + ang + 'deg)';
      var tot = BigInt(E) * BigInt(st.k);
      kEl.textContent = s(st.k);
      eqEl.textContent = st.k + ' × ' + E + ' = ' + tot;
      wrapEl.textContent = tot + ' = ' + st.laps + ' × ' + PH + ' + ' + st.pos;
      posEl.textContent = s(st.pos);
      if (st.k > 0) {
        var li = h('li', { class: st.pos === 1 ? 'is-one' : '' }, st.pos);
        trail.insertBefore(li, trail.firstChild);
        while (trail.children.length > 7) trail.removeChild(trail.lastChild);
      }
    }
    function reset() {
      if (busy || solved) return;
      k = 0; trail.textContent = '';
      paint({ k: 0, pos: 0, laps: 0 }, false);
      msg.className = 'rsa-msg'; msg.textContent = 'Back at 0. Each step moves it ' + E + ' places.';
    }
    async function jump(by) {
      if (busy || solved) return;
      busy = true;
      var r = L.clockJump(E, PH, k, by);
      k = r.k;
      paint({ k: k, pos: r.pos, laps: r.laps });
      if (r.hit) {
        solved = true; svg.classList.add('is-hit');
        allBtns.forEach(function (b) { b.disabled = true; });
        msg.className = 'rsa-msg good';
        msg.textContent = 'Landed on 1 after k = ' + k + ' steps. So ' + E + ' × ' + k + ' leaves remainder 1 on a clock of ' + PH + '. That k is d.';
        api.correct(svg, 'Landed on 1. d is ' + k + '.');
        busy = false;
        await api.sleep(900);
        if (api.alive()) onHit(k);
        return;
      }
      msg.className = 'rsa-msg';
      msg.textContent = r.stepsTaken === 1 ? 'k = ' + k + ': the hand is on ' + r.pos + '.' : 'Jumped ' + r.stepsTaken + ' steps to k = ' + k + ': the hand is on ' + r.pos + ' (' + r.laps + (r.laps === 1 ? ' full lap' : ' full laps') + ' so far). It stops by itself if it passes 1.';
      api.say('k ' + k + ', hand on ' + r.pos);
      await api.sleep(r.stepsTaken > 20 ? 120 : 260);
      busy = false;
    }
    async function autorun() {
      if (busy || solved) return;
      var chunk = Math.max(1, Math.floor(PH / 22));
      while (!solved && api.alive()) {
        if (api.reducedMotion) { await jump(PH); break; }
        busy = false;
        var before = k;
        await jump(chunk);
        if (k === before) break;
        await api.sleep(20);
      }
    }
    function showLaps() {
      if (!lapBox.hidden) { lapBox.hidden = true; return; }
      lapBox.hidden = false; lapBox.textContent = '';
      lapBox.appendChild(h('p', { class: 'rsa-lab' }, 'Landing on 1 means ' + E + ' × k = 1 + (laps × ' + PH + '). Try laps = 1, 2, 3… until the total divides by ' + E + '.'));
      var rows = L.lapRows(E, PH), list = h('ol', { class: 'rsa-laprows' });
      lapBox.appendChild(list);
      rows.forEach(function (r, i) {
        var li = h('li', { class: r.whole ? 'is-whole' : '' },
          h('b', null, r.j + (r.j === 1 ? ' lap' : ' laps')), ' 1 + ' + r.j + ' × ' + PH + ' = ' + r.total + ' ',
          r.whole ? h('span', null, '÷ ' + E + ' = ' + r.d + ' exactly, so k = ' + r.d) : h('span', { class: 'dim' }, '÷ ' + E + ' leaves ' + r.rem));
        list.appendChild(li);
        IKS.anim.fadeUp(li, { y: 6, duration: 240, delay: i * 70 });
      });
      api.say('The lap table is open.');
    }
    var node = h('div', { class: 'rsa-clockwrap' },
      h('div', { class: 'rsa-clockface' }, svg),
      h('div', { class: 'rsa-clockside' },
        h('div', { class: 'rsa-readout' },
          h('p', { class: 'rsa-lab' }, 'Steps taken, k'), kEl,
          h('p', { class: 'rsa-lab' }, 'Distance covered'), eqEl,
          h('p', { class: 'rsa-lab' }, 'Going round the clock of ' + PH), wrapEl,
          h('p', { class: 'rsa-lab' }, 'The hand is on'), posEl),
        h('ol', { class: 'rsa-trail-wrap' }, h('li', { class: 'rsa-lab' }, 'Last landings')), trail,
        h('div', { class: 'row rsa-clockbtns' }, b1, b10, b100),
        h('div', { class: 'row rsa-clockbtns' }, resetBtn, lapBtn, runBtn)),
      msg, lapBox);
    paint({ k: 0, pos: 0, laps: 0 }, true);
    return { node: node, jump: jump, lapBtn: lapBtn };
  }

  function euclidBox(e, phi, d) {
    var rows = L.euclidRows(phi, e);
    var list = h('ol', { class: 'rsa-eu' });
    rows.forEach(function (r) {
      list.appendChild(h('li', { class: 'mono' }, r.a + ' = ' + r.q + ' × ' + r.b + ' + ' + r.r));
    });
    var E = BigInt(e), PH = BigInt(phi), D = BigInt(d);
    var y = (1n - E * D) / PH;
    return h('div', { class: 'rsa-euclid' },
      h('p', { class: 'rsa-lab' }, 'The shortcut: extended Euclid'),
      h('p', null, 'Euclid’s method (the same idea as the gcd check) divides again and again until the remainder is 1:'),
      list,
      h('p', null, 'Run it backwards and it hands us numbers x and y with ', h('b', { class: 'mono' }, e + ' × x + ' + phi + ' × y = 1'),
        '. Here x = ', h('b', { class: 'gold' }, s(d)), ' and y = ', h('b', null, s(y)), '. Check: ',
        h('span', { class: 'mono' }, e + ' × ' + d + ' = ' + (E * D) + ' = ' + (-y) + ' × ' + phi + ' + 1'), '. It agrees with the clock, with no walking.'));
  }

  function lapTable(api, e, phi) {
    var rows = L.lapRows(e, phi), list = h('ol', { class: 'rsa-laprows' });
    rows.forEach(function (r, i) {
      var li = h('li', { class: r.whole ? 'is-whole' : '' },
        h('b', null, r.j + (r.j === 1 ? ' lap' : ' laps')), ' 1 + ' + r.j + ' × ' + phi + ' = ' + r.total + ' ',
        r.whole ? h('span', null, '÷ ' + e + ' = ' + r.d + ' exactly, so d = ' + r.d) : h('span', { class: 'dim' }, '÷ ' + e + ' leaves ' + r.rem));
      list.appendChild(li);
      IKS.anim.fadeUp(li, { y: 6, duration: 240, delay: i * 60 });
    });
    return h('div', { class: 'rsa-lapbox' }, h('p', { class: 'rsa-lab' }, 'Lap trick: ' + e + ' × d = 1 + (laps × ' + phi + '). Try laps = 1, 2, 3 until the total divides by ' + e + '.'), list);
  }

  var TITLES = ['The shared table', 'Forge your keys', 'Lock and unlock', 'Be the attacker'];
  var DEVA = ['१', '२', '३', '४'];

  IKS.registerLevel({
    id: 'rsa', num: 7, title: 'Pivot to RSA', tagline: 'Make a key pair and open a locked message',
    goal: 'Public key', era: 'RSA, 1977', icon: '🔑', sources: SOURCES,
    mount: function (root, api) {
      var wrongs = 0, S = { keys: null };
      var stage = h('div', { class: 'rsa-stage' },
        IKS.motifs.jaali({ glow: true }),
        h('div', { class: 'rsa-deva deva', 'aria-hidden': 'true', lang: 'sa' }, 'कुञ्जी'));
      var keyring = h('div', { class: 'rsa-keyring', hidden: true, 'aria-label': 'Your keys' });
      stage.appendChild(keyring);
      var acts = [];

      function mkAct(i, title, dek) {
        var heading = h('h2', { class: 'rsa-act-title', tabindex: '-1' }, title);
        var body = h('div', { class: 'rsa-actbody' });
        var hl = IKS.motifs.hairline();
        var sec = h('section', { class: 'rsa-act', 'data-act': i, hidden: true, 'aria-label': title },
          h('header', { class: 'rsa-act-head' },
            h('span', { class: 'rsa-numeral deva', 'aria-hidden': 'true' }, DEVA[i - 1]),
            h('div', null, heading, h('p', { class: 'rsa-dek' }, dek))),
          hl, body);
        stage.appendChild(sec);
        acts.push({ sec: sec, body: body, heading: heading, hl: hl });
        return acts[acts.length - 1];
      }
      function go(i) {
        acts.forEach(function (a, j) { a.sec.hidden = j !== i - 1; });
        api.round(i, 4, TITLES[i - 1]);
        var a = acts[i - 1];
        IKS.anim.fadeUp(a.sec);
        setTimeout(function () { a.hl.classList.add('is-in'); }, api.reducedMotion ? 0 : 120);
        try { a.heading.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
        if (i > 1) try { stage.scrollIntoView({ block: 'start', behavior: api.reducedMotion ? 'auto' : 'smooth' }); } catch (e) { /* ignore */ }
      }
      function miss(node, msg) { wrongs++; api.wrong(node, msg); }
      function setMsg(p, text, kind) { p.textContent = text; p.className = 'rsa-msg' + (kind ? ' ' + kind : ''); }
      function reveal(node) { node.hidden = false; IKS.anim.fadeUp(node, { y: 12 }); }
      function pill(label, nums) {
        return h('div', { class: 'rsa-kp' }, h('b', null, label), nums.map(function (x) { return h('span', { class: 'mono' }, x); }));
      }
      function renderKeyring() {
        var K = S.keys;
        keyring.textContent = '';
        if (!K) { keyring.hidden = true; return; }
        keyring.hidden = false;
        keyring.appendChild(pill('Public lock', ['n = ' + K.n, 'e = ' + K.e]));
        keyring.appendChild(pill('Private key', ['n = ' + K.n, 'd = ' + K.d]));
      }

      /* ================================================================ ACT 1 */
      var a1 = mkAct(1, 'The shared-table problem', 'Every older method needed both sides to hold the same secret.');
      var scene = buildScene(api);
      var cta1 = h('button', { type: 'button', class: 'btn btn-gold btn-lg', hidden: true, 'data-next': '1', on: { click: function () { go(2); } } }, 'What if the lock could be public?');
      scene.setOnDone(function () { reveal(cta1); });
      a1.body.appendChild(h('div', { class: 'rsa-scenewrap' }, scene.svg));
      a1.body.appendChild(scene.caption);
      a1.body.appendChild(h('div', { class: 'row rsa-row-ctl' }, scene.controls, cta1));

      /* ================================================================ ACT 2 */
      var a2 = mkAct(2, 'Forge your keys', 'Two primes make a lock anyone can use and a key only we hold.');
      var COINS = [11, 13, 17, 19, 21, 23, 27, 29, 31, 33, 37, 39, 41, 43, 47, 49, 51, 53, 57, 59, 61, 63, 67, 69, 71, 73, 77, 79, 83, 87, 89, 91, 93, 97];

      function buildForge() {
        var F = { p: null, q: null, e: null, locked: false };
        var box = h('div', { class: 'rsa-forge' });
        var msg1 = h('p', { class: 'rsa-msg', role: 'status' }, 'Tap two prime coins. Careful: some coins are fakes.');
        var coinEls = {};
        function mkSlot(name) {
          var v = h('span', { class: 'slot-v' }, '–');
          var b = h('button', { type: 'button', class: 'rsa-slot', 'data-slot': name, 'aria-label': 'Slot ' + name + ', empty', on: { click: function () { clearSlot(name); } } },
            h('span', { class: 'slot-l' }, name), v);
          return { node: b, set: function (x) { v.textContent = s(x); b.classList.add('is-full'); b.setAttribute('aria-label', 'Slot ' + name + ': ' + x + '. Tap to take it out.'); },
            clear: function () { v.textContent = '–'; b.classList.remove('is-full'); b.setAttribute('aria-label', 'Slot ' + name + ', empty'); } };
        }
        var slotP = mkSlot('p'), slotQ = mkSlot('q');
        var coins = h('div', { class: 'rsa-coins', role: 'group', 'aria-label': 'Brass coins. Some are prime and some are not.' },
          COINS.map(function (v) {
            var b = h('button', { type: 'button', class: 'rsa-coin', 'data-coin': v, 'aria-label': 'Coin ' + v, on: { click: function () { pick(v, b); } } }, h('span', null, v));
            coinEls[v] = b; return b;
          }));

        var nEl = h('span', { class: 'rsa-big' }, '0'), phiEl = h('span', { class: 'rsa-big' }, '0');
        var lineN = h('p', { class: 'rsa-calcline' }), linePhi = h('p', { class: 'rsa-calcline' });
        var stN = h('div', { class: 'rsa-step', hidden: true },
          h('div', { class: 'rsa-calc' }, h('p', { class: 'rsa-lab rsa-cap' }, 'n = p × q goes into both keys'), lineN),
          h('div', { class: 'rsa-calc' }, h('p', { class: 'rsa-lab rsa-cap' }, 'φ = (p − 1)(q − 1) stays secret'), linePhi));

        var msgE = h('p', { class: 'rsa-msg', role: 'status' }, 'Pick a number e. It must share no factor with φ (gcd = 1).');
        var gcdLine = h('p', { class: 'rsa-gcdline mono' });
        var chipBox = h('div', { class: 'rsa-echips', role: 'group', 'aria-label': 'Choices for e' });
        var stE = h('div', { class: 'rsa-step', hidden: true }, h('h3', { class: 'rsa-h3' }, 'Choose e, the locking number'), chipBox, gcdLine, msgE);
        var stClock = h('div', { class: 'rsa-step', hidden: true });
        var stKeys = h('div', { class: 'rsa-step', hidden: true });

        function pick(v, b) {
          if (F.locked) return;
          if (!L.isPrime(v)) {
            var f = Number(L.factorSmall(v)[0]);
            b.classList.add('is-cracked'); b.disabled = true;
            setMsg(msg1, v + ' = ' + f + ' × ' + (v / f) + '. Not prime, so the coin cracked.', 'bad');
            miss(b, v + ' is not prime. It is ' + f + ' times ' + (v / f) + '.');
            return;
          }
          if (F.p === v || F.q === v) { setMsg(msg1, 'Pick two different primes.', 'bad'); api.say('Pick two different primes.'); return; }
          if (F.p != null && F.q != null) { setMsg(msg1, 'Both slots are full. Tap a slot to take its coin out.', 'bad'); api.say('Both slots are full.'); return; }
          if (F.p == null) { F.p = v; slotP.set(v); } else { F.q = v; slotQ.set(v); }
          b.classList.add('is-used');
          setMsg(msg1, v + ' is prime. ' + (F.p != null && F.q != null ? '' : 'One more.'), 'good');
          api.say(v + ' placed.');
          if (F.p != null && F.q != null) afterPQ();
        }
        function clearSlot(name) {
          if (F.locked) return;
          var v = F[name]; if (v == null) return;
          F[name] = null; (name === 'p' ? slotP : slotQ).clear();
          coinEls[v].classList.remove('is-used');
          [stN, stE, stClock, stKeys].forEach(function (x) { x.hidden = true; });
          stClock.textContent = ''; stKeys.textContent = '';
          setMsg(msg1, 'Coin taken out. Pick another prime.');
        }
        function afterPQ() {
          var K = L.keygen(F.p, F.q, L.eChips(F.p, F.q).filter(function (c) { return c.ok; })[0].e); // validates p, q
          var n = Number(K.n), phi = Number(K.phi);
          reveal(stN);
          lineN.textContent = ''; linePhi.textContent = '';
          lineN.append(F.p + ' × ' + F.q + ' = ', nEl);
          linePhi.append('(' + (F.p - 1) + ') × (' + (F.q - 1) + ') = ', phiEl);
          IKS.anim.roll(nEl, 0, n, 900);
          IKS.anim.roll(phiEl, 0, phi, 1100);
          chipBox.textContent = ''; gcdLine.textContent = ''; setMsg(msgE, 'Pick a number e. It must share no factor with φ (gcd = 1).');
          L.eChips(F.p, F.q).forEach(function (c) {
            var b = h('button', { type: 'button', class: 'rsa-echip', 'data-e': c.e, on: { click: function () { pickE(c, b, phi); } } }, s(c.e));
            chipBox.appendChild(b);
          });
          setTimeout(function () { if (api.alive() && !F.locked) reveal(stE); }, api.reducedMotion ? 0 : 700);
        }
        function pickE(c, b, phi) {
          if (F.locked) return;
          var rows = L.euclidRows(phi, c.e);
          gcdLine.textContent = 'Euclid: ' + rows.map(function (r) { return r.a + ' = ' + r.q + ' × ' + r.b + ' + ' + r.r; }).join('  ·  ') + '  →  gcd(' + c.e + ', ' + phi + ') = ' + c.g;
          if (!c.ok) {
            b.classList.add('is-bad'); b.disabled = true;
            setMsg(msgE, c.e + ' and ' + phi + ' share the factor ' + c.g + '. A hand moving ' + c.e + ' at a time can then only land on multiples of ' + c.g + ', never on 1. Try another.', 'bad');
            miss(b, c.e + ' shares a factor with phi.');
            return;
          }
          F.e = c.e; F.locked = true;
          b.classList.add('is-good');
          Array.prototype.forEach.call(chipBox.children, function (x) { x.disabled = true; });
          slotP.node.disabled = true; slotQ.node.disabled = true;
          setMsg(msgE, 'gcd = 1. They share no factor, so a clock hand moving ' + c.e + ' at a time can reach every spot, including 1.', 'good');
          api.correct(b, 'e is ' + c.e + '. Coprime with phi.');
          setTimeout(function () { if (api.alive()) startClock(phi); }, api.reducedMotion ? 0 : 900);
        }
        function startClock(phi) {
          stClock.textContent = '';
          stClock.appendChild(h('h3', { class: 'rsa-h3' }, 'Find d, the unlocking number'));
          stClock.appendChild(h('p', { class: 'rsa-p' }, 'd is the number of steps of size e = ' + F.e + ' that brings the hand back to exactly 1 on a clock of ' + phi + ' places. Step it round.'));
          var clock = buildClock(api, F.e, phi, function (d) { showKeys(d); });
          stClock.appendChild(clock.node);
          reveal(stClock);
        }
        function showKeys(d) {
          var K = L.keygen(F.p, F.q, F.e);
          if (K.d !== BigInt(d)) { api.say('Something is off.'); return; }
          S.keys = K; renderKeyring();
          stKeys.textContent = '';
          var lock = IKS.motifs.lock({ size: 92 }), key = IKS.motifs.key({ size: 150 });
          stKeys.appendChild(euclidBox(F.e, K.phi, K.d));
          stKeys.appendChild(h('div', { class: 'rsa-keycards' },
            h('div', { class: 'rsa-keycard rsa-pub' }, lock, h('h3', null, 'Public lock'),
              h('p', { class: 'mono' }, 'n = ' + K.n), h('p', { class: 'mono' }, 'e = ' + K.e), h('p', { class: 'dim' }, 'Bhanu hands this to everyone. The spy too.')),
            h('div', { class: 'rsa-keycard rsa-priv' }, key, h('h3', null, 'Private key'),
              h('p', { class: 'mono' }, 'n = ' + K.n), h('p', { class: 'mono' }, 'd = ' + K.d), h('p', { class: 'dim' }, 'Never leaves Bhanu. φ, p and q are thrown away.'))));
          stKeys.appendChild(h('div', { class: 'row rsa-row-ctl' },
            h('button', { type: 'button', class: 'btn btn-gold btn-lg', 'data-next': '2', on: { click: function () { buildLockAct(); go(3); } } }, 'Lock a message with it'),
            h('button', { type: 'button', class: 'btn btn-ghost on-dark', on: { click: function () { S.keys = null; renderKeyring(); rebuildForge(); } } }, 'Forge different keys')));
          reveal(stKeys);
          IKS.anim.stagger(stKeys.querySelectorAll('.rsa-keycard'), { step: 140, y: 14 });
        }

        box.appendChild(h('h3', { class: 'rsa-h3' }, 'Choose two prime coins'));
        box.appendChild(h('div', { class: 'rsa-slots' }, slotP.node, h('span', { class: 'rsa-times', 'aria-hidden': 'true' }, '×'), slotQ.node));
        box.appendChild(coins); box.appendChild(msg1);
        box.appendChild(stN); box.appendChild(stE); box.appendChild(stClock); box.appendChild(stKeys);
        return box;
      }
      var forge = buildForge();
      a2.body.appendChild(forge);
      function rebuildForge() {
        var nf = buildForge();
        a2.body.replaceChild(nf, forge); forge = nf;
        IKS.anim.fadeUp(nf);
      }

      /* ================================================================ ACT 3 */
      var a3 = mkAct(3, 'Lock and unlock', 'Arya locks a word with Bhanu’s public lock. Only Bhanu’s private key opens it.');
      var act3Built = false;
      function buildLockAct() {
        if (act3Built) return; act3Built = true;
        var K = S.keys, mach = buildMachine(api), word = '', nums = [], cs = [], tiles = [], sel = 0, mode = 'idle';
        var tried = { pub: false, priv: false };
        var lockFig = IKS.motifs.lock({ size: 96 });
        var msg = h('p', { class: 'rsa-msg', role: 'status' }, 'Arya has only Bhanu’s public lock. Choose her word (2 to 8 letters).');
        var input = h('input', { type: 'text', class: 'rsa-input', maxlength: 8, value: 'LOTUS', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Word to send, letters only' });
        var lockBtn = h('button', { type: 'submit', class: 'btn btn-gold', 'data-lock': '1' }, 'Lock it');
        var sugg = h('div', { class: 'row rsa-sugg', role: 'group', 'aria-label': 'Suggested words' },
          ['LOTUS', 'TULSI', 'GOLD', 'RIVER'].map(function (w) { return h('button', { type: 'button', class: 'rsa-sg', on: { click: function () { input.value = w; input.focus(); } } }, w); }));
        var form = h('form', { class: 'rsa-form', on: { submit: function (ev) { ev.preventDefault(); doLock(); } } },
          h('label', { class: 'rsa-lab', for: 'rsa-word' }, 'Arya’s word'), input, lockBtn);
        input.id = 'rsa-word';
        var tilesBox = h('div', { class: 'rsa-tiles', role: 'group', 'aria-label': 'Letters. Tap one to watch its lock or unlock.' });
        var strip = h('p', { class: 'rsa-strip', hidden: true, role: 'status' });
        var machWrap = h('div', { hidden: true }, mach.node);
        var pubBtn = h('button', { type: 'button', class: 'btn btn-ghost on-dark', 'data-try': 'public', on: { click: tryPublic } }, 'Try the public lock (n, e)');
        var privBtn = h('button', { type: 'button', class: 'btn btn-gold', 'data-try': 'private', on: { click: usePrivate } }, 'Use the private key (n, d)');
        var unlockMsg = h('p', { class: 'rsa-msg', role: 'status' }, 'Bhanu has the locked numbers. Which key will he use? Try both.');
        var next = h('button', { type: 'button', class: 'btn btn-gold btn-lg', hidden: true, 'data-next': '3', on: { click: function () { buildAttackAct(); go(4); } } }, 'Next: be the attacker');
        var unlockPanel = h('div', { class: 'rsa-step', hidden: true },
          h('h3', { class: 'rsa-h3' }, 'Bhanu opens it'), h('div', { class: 'row' }, pubBtn, privBtn), unlockMsg, next);

        a3.body.appendChild(h('div', { class: 'rsa-split' },
          h('div', { class: 'rsa-split-main' }, form, sugg, msg, tilesBox, machWrap, strip, unlockPanel),
          h('div', { class: 'rsa-lockfig', 'aria-hidden': 'true' }, lockFig)));

        function selectTile(i, runIt) {
          sel = i;
          tiles.forEach(function (t, j) { t.b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); t.b.classList.toggle('is-sel', j === i); });
          if (!runIt || mode === 'idle') return;
          if (mode === 'lock') return mach.run({ base: nums[i], exp: K.e, mod: K.n, title: 'Locking “' + word[i] + '” (' + nums[i] + ') with the public lock', verb: 'So the lock turns' });
          return mach.run({ base: cs[i], exp: K.d, mod: K.n, title: 'Unlocking number ' + cs[i] + ' with the private key', verb: 'So the key turns', ms: 220 });
        }
        async function doLock() {
          var raw = input.value.toUpperCase().replace(/[^A-Z]/g, '');
          if (raw.length < 2 || raw.length > 8) { setMsg(msg, 'Use 2 to 8 letters, A to Z.', 'bad'); api.wrong(input, 'Use 2 to 8 letters.'); return; }
          word = raw; nums = L.textToNums(raw);
          cs = nums.map(function (m) { return L.encrypt(m, K.pub); });
          input.disabled = true; lockBtn.disabled = true;
          Array.prototype.forEach.call(sugg.children, function (x) { x.disabled = true; });
          tilesBox.textContent = ''; tiles = [];
          word.split('').forEach(function (ch, i) {
            var l = h('span', { class: 't-l' }, ch), m = h('span', { class: 't-m' }, s(nums[i])), c = h('span', { class: 't-c' }, '–');
            var b = h('button', { type: 'button', class: 'rsa-tile', 'aria-pressed': 'false', 'data-i': i, on: { click: function () { selectTile(i, true); } } },
              h('span', { class: 't-top' }, l, m), h('span', { class: 't-arrow', 'aria-hidden': 'true' }, '↓'), c);
            tilesBox.appendChild(b); tiles.push({ b: b, l: l, m: m, c: c });
          });
          IKS.anim.stagger(tilesBox.children, { step: 50, y: 10 });
          setMsg(msg, 'Each letter becomes a number (A=1 … Z=26). Then the lock turns: c = m^' + K.e + ' mod ' + K.n + '. Watch the first one.', '');
          mode = 'lock'; reveal(machWrap);
          sel = 0; selectTile(0, false);
          var r = await mach.run({ base: nums[0], exp: K.e, mod: K.n, title: 'Locking “' + word[0] + '” (' + nums[0] + ') with the public lock', verb: 'So the lock turns' });
          if (r == null || !api.alive()) return;
          for (var i = 0; i < tiles.length; i++) {
            var t = tiles[i];
            if (i === 0) { await IKS.anim.roll(t.c, 0, Number(cs[0]), 400); }
            else { IKS.anim.roll(t.c, 0, Number(cs[i]), 600); await api.sleep(110); }
            t.c.textContent = s(cs[i]);
            t.b.classList.add('is-locked');
          }
          await api.sleep(500);
          for (var j = 0; j < tiles.length; j++) { IKS.anim.flipText(tiles[j].l, '?', 260); tiles[j].m.textContent = '?'; }
          var note = nums.indexOf(1) >= 0 ? ' (A is 1, and 1 to any power stays 1, so A never hides. Real systems add random padding to fix that.)' : '';
          setMsg(msg, 'Locked. Arya sends only these numbers: ' + cs.join(', ') + '. The spy can see them too.' + note, 'good');
          api.say('Locked. Numbers: ' + cs.join(', '));
          lockFig.classList.remove('is-open');
          reveal(unlockPanel);
          mode = 'lock';
        }
        function showStrip(items, kind, lead) {
          strip.hidden = false; strip.className = 'rsa-strip ' + kind; strip.textContent = '';
          strip.appendChild(h('span', { class: 'rsa-lab' }, lead));
          items.forEach(function (x) { strip.appendChild(h('span', { class: 'rsa-sc' }, s(x))); });
          IKS.anim.stagger(strip.querySelectorAll('.rsa-sc'), { step: 60, y: 6 });
        }
        function after() {
          if (tried.pub && tried.priv) {
            next.hidden = false; IKS.anim.fadeUp(next);
            setMsg(unlockMsg, 'Now we see it. Anyone can lock; only d unlocks. That is the shared-table problem solved.', 'good');
          }
        }
        async function tryPublic() {
          if (mode === 'idle') return;
          mode = 'public';
          var junk = cs.map(function (c) { return L.modPow(c, K.e, K.n); });
          var same = junk.every(function (x, i) { return x === BigInt(nums[i]); });
          await mach.run({ base: cs[sel], exp: K.e, mod: K.n, title: 'Trying to unlock number ' + cs[sel] + ' with the PUBLIC key', verb: 'The public key gives' });
          if (!api.alive()) return;
          if (same) { setMsg(unlockMsg, 'This word survives the public key by luck (a letter A stays 1). Pick a word without A, or keep going.', 'bad'); mode = 'lock'; return; }
          showStrip(junk, 'bad', 'Public key result');
          lockFig.classList.remove('is-open');
          IKS.anim.shake(strip);
          setMsg(unlockMsg, 'Garbage. These numbers are not the letters we started with (' + nums.join(', ') + '). The public key only locks.', 'bad');
          api.say('Garbage. The public key cannot unlock.');
          tried.pub = true; mode = 'lock'; after();
        }
        async function usePrivate() {
          if (mode === 'idle') return;
          mode = 'unlock';
          await mach.run({ base: cs[sel], exp: K.d, mod: K.n, title: 'Unlocking number ' + cs[sel] + ' with the private key', verb: 'So the key turns', ms: 200 });
          if (!api.alive()) return;
          var back = cs.map(function (c) { return L.decrypt(c, K.priv); });
          for (var i = 0; i < tiles.length; i++) {
            IKS.anim.flipText(tiles[i].l, word[i], 320); tiles[i].m.textContent = s(back[i]);
            tiles[i].b.classList.add('is-open');
            await api.sleep(120);
          }
          lockFig.classList.add('is-open');
          showStrip(back, 'good', 'Private key result');
          setMsg(unlockMsg, 'Bhanu reads “' + L.numsToText(back) + '”. The letters are back.', 'good');
          api.correct(strip, 'Unlocked. The word is ' + L.numsToText(back));
          tried.priv = true; after();
        }
      }

      /* ================================================================ ACT 4 */
      var a4 = mkAct(4, 'Be the attacker', 'The spy has the public key and a locked message. Can he break it?');
      var act4Built = false;
      function buildAttackAct() {
        if (act4Built) return; act4Built = true;
        var A = L.ATTACK, N = Number(A.n), E = Number(A.e);
        var phiV = 3120, mach = buildMachine(api);
        function step(hidden) { return h('div', { class: 'rsa-step', hidden: !!hidden }); }
        function numField(label, id, hint) {
          var inp = h('input', { type: 'text', inputmode: 'numeric', pattern: '[0-9]*', class: 'rsa-input', id: id, autocomplete: 'off', 'aria-label': label });
          return inp;
        }
        /* intro */
        var cipherRow = h('div', { class: 'rsa-cipherrow', 'aria-label': 'Intercepted numbers' }, A.cipher.map(function (c) { return h('span', { class: 'rsa-sc big' }, s(c)); }));
        var intro = h('div', { class: 'rsa-intercept' },
          h('p', { class: 'rsa-lab' }, 'Intercepted'),
          h('p', null, 'Public key ', h('b', { class: 'mono gold' }, 'n = ' + N + ', e = ' + E), '. Locked word:'), cipherRow,
          h('p', { class: 'dim' }, 'To read it the spy needs d. To get d he needs φ. To get φ he needs p and q, the two primes inside n. So: factor ' + N + '.'));

        /* step 1: the limit */
        var kIn = h('input', { type: 'number', class: 'rsa-input rsa-k', min: 2, max: 3233, value: 40, 'aria-label': 'k', inputmode: 'numeric' });
        var kOut = h('p', { class: 'rsa-kout mono', 'aria-live': 'polite' });
        var msg1 = h('p', { class: 'rsa-msg', role: 'status' }, 'We will test divisors. But how far do we need to go? Find the biggest k with k × k ≤ ' + N + '.');
        function upd() {
          var k = Math.max(0, Math.floor(Number(kIn.value) || 0)), kk = k * k;
          kOut.textContent = k + ' × ' + k + ' = ' + kk + (kk <= N ? '  ≤ ' + N + '  (fits)' : '  > ' + N + '  (too big)');
          kOut.className = 'rsa-kout mono ' + (kk <= N ? 'fits' : 'over');
        }
        kIn.addEventListener('input', upd); upd();
        function bump(d) { return h('button', { type: 'button', class: 'btn btn-ghost on-dark btn-sm', 'aria-label': d > 0 ? 'k up by one' : 'k down by one', on: { click: function () { kIn.value = Math.max(2, (Number(kIn.value) || 0) + d); upd(); } } }, d > 0 ? '+1' : '−1'); }
        var limitBtn = h('button', { type: 'button', class: 'btn btn-gold', 'data-limit': '1', on: { click: checkLimit } }, 'Lock in this limit');
        var st1 = h('div', { class: 'rsa-step' }, h('h3', { class: 'rsa-h3' }, '1 · How far must we search?'),
          h('p', { class: 'rsa-p' }, 'If n = a × b and a is the smaller one, then a × a ≤ n. So a is at most √n. Find where √' + N + ' sits.'),
          h('div', { class: 'row rsa-kctl' }, bump(-1), kIn, bump(1), limitBtn), kOut, msg1);
        var limit = 0;
        function checkLimit() {
          if (limit) return;
          var k = Math.floor(Number(kIn.value) || 0);
          if (k === 56) {
            limit = 56;
            setMsg(msg1, '56 × 56 = 3136 fits and 57 × 57 = 3249 does not, so √' + N + ' ≈ 56.9. The smaller prime factor is at most 56. We never test above 56.', 'good');
            api.correct(limitBtn, 'Limit is 56.');
            limitBtn.disabled = true; kIn.disabled = true;
            board.classList.add('has-limit'); reveal(st2);
          } else if (k * k <= N) { setMsg(msg1, k + ' × ' + k + ' = ' + (k * k) + ' still fits under ' + N + '. Go higher.', 'bad'); miss(limitBtn, 'Go higher.'); }
          else { setMsg(msg1, k + ' × ' + k + ' = ' + (k * k) + ' is already too big. Go lower, or check the one just below.', 'bad'); miss(limitBtn, 'Too big.'); }
        }

        /* step 2: sieve board */
        var status = {}, cellEl = {}, found = null;
        var testLine = h('p', { class: 'rsa-testline mono', role: 'status' }, 'Tap a prime to test it as a divisor of ' + N + '.');
        var msg2 = h('p', { class: 'rsa-msg', role: 'status' }, 'If a prime does not divide n, none of its multiples can either. Watch them fall.');
        var board = h('div', { class: 'rsa-board', role: 'group', 'aria-label': 'Numbers 1 to 64. Numbers above 56 are past the limit.' });
        var line = h('div', { class: 'rsa-line', 'aria-hidden': 'true' }, h('span', null, '√' + N + ' ≈ 56.9'));
        for (var x = 1; x <= 64; x++) (function (x) {
          if (x === 57) board.appendChild(line);
          var b = h('button', { type: 'button', class: 'rsa-cell' + (x > 56 ? ' is-beyond' : '') + (x === 1 ? ' is-one' : '') + (L.isPrime(x) ? ' is-prime' : ''), 'data-n': x, disabled: x === 1, 'aria-label': x === 1 ? '1, not prime and not composite' : null, on: { click: function () { testCell(x); } } }, s(x));
          cellEl[x] = b; board.appendChild(b); status[x] = 'open';
        })(x);
        var logList = h('ol', { class: 'rsa-testlog', 'aria-label': 'Tests so far' });
        var logEmpty = h('p', { class: 'dim rsa-logempty' }, 'Nothing tested yet.');
        var side = h('aside', { class: 'rsa-sieveside' },
          h('div', { class: 'rsa-sidecard' }, h('p', { class: 'rsa-lab' }, 'Why only up to 56?'),
            h('p', null, 'If n = a × b, the smaller of the two is at most √n ≈ 56.9. A factor below the dashed line always has a partner above it, so we meet the small one first.'),
            h('p', { class: 'dim' }, 'Brass coins are primes. Test one: if it fails, all its multiples fall too.')),
          h('div', { class: 'rsa-sidecard' }, h('p', { class: 'rsa-lab' }, 'Tests so far'), testLine, logEmpty, logList));
        var st2 = h('div', { class: 'rsa-step', hidden: true }, h('h3', { class: 'rsa-h3' }, '2 · The sieve board'),
          h('div', { class: 'rsa-sievegrid' }, h('div', { class: 'rsa-boardcol' }, board, h('p', { class: 'rsa-legend dim' }, 'Numbers below the dashed line are beyond √n.')), side), msg2);
        async function testCell(x) {
          if (found) return;
          if (x > limit) { setMsg(msg2, x + ' is past the limit. If it divided n, its partner would be smaller than 57 and we would meet that one first.', 'bad'); api.say('Past the limit.'); return; }
          if (status[x] === 'crossed') { setMsg(msg2, x + ' is a multiple of a prime that already failed, so it fails too.', ''); return; }
          if (status[x] === 'tested') return;
          if (!L.isPrime(x)) {
            var f = Number(L.factorSmall(x)[0]);
            setMsg(msg2, x + ' = ' + f + ' × ' + (x / f) + '. Test ' + f + ' first: if ' + f + ' fails, ' + x + ' fails too.', '');
            IKS.anim.shake(cellEl[x]); return;
          }
          var r = N % x, qt = Math.floor(N / x);
          testLine.textContent = N + ' ÷ ' + x + ' = ' + qt + ' remainder ' + r + (r === 0 ? '  → a factor!' : '  → no');
          logEmpty.hidden = true; testLine.hidden = true;
          logList.insertBefore(h('li', { class: 'mono' + (r === 0 ? ' is-hit' : '') }, h('b', null, x), ' → ' + N + ' ÷ ' + x + ' = ' + qt + ' r ' + r + (r === 0 ? '  factor' : '  no')), logList.firstChild);
          if (r !== 0) {
            status[x] = 'tested'; cellEl[x].classList.add('is-tested');
            var n = 0;
            for (var m = x * 2; m <= 64; m += x) {
              if (status[m] === 'open') { status[m] = 'crossed'; (function (c, d) { setTimeout(function () { c.classList.add('is-crossed'); }, api.reducedMotion ? 0 : d); })(cellEl[m], n * 45); n++; }
            }
            setMsg(msg2, x + ' does not divide ' + N + (n ? ', so its ' + n + ' multiples are crossed out.' : '.'), '');
            api.say(x + ' is not a factor.');
          } else {
            found = x; status[x] = 'factor';
            cellEl[x].classList.add('is-factor');
            var q = N / x;
            await api.sleep(500);
            if (!api.alive()) return;
            if (cellEl[q]) cellEl[q].classList.add('is-partner');
            setMsg(msg2, 'Found it: ' + x + ' × ' + q + ' = ' + N + '. The partner ' + q + ' sits past the line, as it must.', 'good');
            api.correct(cellEl[x], x + ' divides ' + N + '. The other factor is ' + q + '.');
            reveal(st3);
          }
        }

        /* step 3: phi */
        var phiIn = numField('phi', 'rsa-phi'), phiMsg = h('p', { class: 'rsa-msg', role: 'status' }, 'Now φ = (p − 1)(q − 1). Type it.');
        var phiBtn = h('button', { type: 'submit', class: 'btn btn-gold' }, 'Check φ');
        var st3 = h('div', { class: 'rsa-step', hidden: true }, h('h3', { class: 'rsa-h3' }, '3 · φ'),
          h('form', { class: 'rsa-form', on: { submit: function (ev) { ev.preventDefault(); checkPhi(); } } }, h('label', { class: 'rsa-lab rsa-cap', for: 'rsa-phi' }, 'φ = (53 − 1) × (61 − 1) ='), phiIn, phiBtn), phiMsg);
        function checkPhi() {
          var v = String(phiIn.value).trim();
          if (v === String(phiV)) {
            setMsg(phiMsg, 'φ = 52 × 60 = 3120. The spy can now compute this, because he knows p and q. Nobody else can from n alone.', 'good');
            api.correct(phiBtn, 'phi is 3120.'); phiBtn.disabled = true; phiIn.disabled = true; reveal(st4);
          } else { setMsg(phiMsg, 'Not yet. Subtract 1 from each prime first: 52 and 60. Then multiply.', 'bad'); miss(phiBtn, 'Not quite.'); }
        }

        /* step 4: d */
        var dIn = numField('d', 'rsa-d'), dMsg = h('p', { class: 'rsa-msg', role: 'status' }, 'Find d so that ' + E + ' × d leaves remainder 1 on a clock of ' + phiV + '. You may walk the clock, or use the lap trick.');
        var dBtn = h('button', { type: 'submit', class: 'btn btn-gold', 'data-d': '1' }, 'Check d');
        var lapHolder = h('div', null);
        var lapBtn = h('button', { type: 'button', class: 'btn btn-ghost on-dark btn-sm', 'data-laps': '1', on: { click: function () {
          if (lapHolder.firstChild) { lapHolder.textContent = ''; return; } lapHolder.appendChild(lapTable(api, E, phiV)); } } }, 'Hint: show the lap table');
        var st4 = h('div', { class: 'rsa-step', hidden: true }, h('h3', { class: 'rsa-h3' }, '4 · d'),
          h('form', { class: 'rsa-form', on: { submit: function (ev) { ev.preventDefault(); checkD(); } } }, h('label', { class: 'rsa-lab rsa-cap', for: 'rsa-d' }, 'd ='), dIn, dBtn, lapBtn), dMsg, lapHolder);
        function checkD() {
          var raw = String(dIn.value).trim();
          if (!/^\d+$/.test(raw)) { setMsg(dMsg, 'Type a whole number.', 'bad'); api.wrong(dIn, 'Type a whole number.'); return; }
          var v = BigInt(raw);
          if (v === 2753n) {
            setMsg(dMsg, '17 × 2753 = 46801 = 15 × 3120 + 1. Remainder 1, so d = 2753.', 'good');
            api.correct(dBtn, 'd is 2753.'); dBtn.disabled = true; dIn.disabled = true; lapBtn.disabled = true; reveal(st5);
          } else {
            var rem = (BigInt(E) * v) % BigInt(phiV);
            setMsg(dMsg, E + ' × ' + raw + ' leaves remainder ' + rem + ' on the clock of ' + phiV + ', not 1.', 'bad'); miss(dBtn, 'Not quite.');
          }
        }

        /* step 5: decrypt */
        var plainRow = h('div', { class: 'rsa-cipherrow', hidden: true, 'aria-live': 'polite' });
        var decMsg = h('p', { class: 'rsa-msg', role: 'status' }, 'With d, the spy runs the same square-and-multiply on each number.');
        var decBtn = h('button', { type: 'button', class: 'btn btn-gold', 'data-decrypt': '1', on: { click: decrypt } }, 'Decrypt with d = 2753');
        var st5 = h('div', { class: 'rsa-step', hidden: true }, h('h3', { class: 'rsa-h3' }, '5 · Read it'), mach.node, h('div', { class: 'row' }, decBtn), decMsg, plainRow);
        var decDone = false;
        async function decrypt() {
          if (decDone) return; decDone = true; decBtn.disabled = true;
          var priv = { n: A.n, d: 2753n };
          await mach.run({ base: A.cipher[0], exp: 2753n, mod: A.n, title: 'Unlocking number ' + A.cipher[0] + ' with d = 2753', verb: 'So the key turns', ms: 200 });
          if (!api.alive()) return;
          var back = A.cipher.map(function (c) { return L.decrypt(c, priv); });
          plainRow.hidden = false;
          for (var i = 0; i < back.length; i++) {
            var cell = h('span', { class: 'rsa-sc big good' }, s(back[i]));
            plainRow.appendChild(cell);
            IKS.anim.fadeUp(cell, { y: 8 }); await api.sleep(150);
            await IKS.anim.flipText(cell, L.numsToText([back[i]]), 300);
          }
          setMsg(decMsg, 'The spy reads “' + L.numsToText(back) + '”. For small numbers like these, the lock was breakable in under a minute.', 'good');
          api.correct(plainRow, 'The word is ' + L.numsToText(back));
          reveal(st6);
        }

        /* step 6: the real size */
        var digits = L.bigNumber2048().toString();
        var ticker = h('div', { class: 'rsa-ticker', 'aria-hidden': 'true' });
        var track = h('div', { class: 'rsa-ticker-track mono' }, digits);
        ticker.appendChild(track);
        var counter = h('p', { class: 'rsa-counter' }, '0 digits');
        var wrapped = h('p', { class: 'rsa-digits mono', hidden: true, 'aria-label': 'A 617-digit number, the size of a 2048-bit RSA modulus' }, digits);
        var sizeMsg = h('div', { class: 'rsa-sizemsg', hidden: true },
          h('p', null, 'Our n had ', h('b', null, '4 digits'), ' and took at most 16 divisions. A modulus the size of a real 2048-bit n has ', h('b', null, '617 digits'), '. The same method would have to test divisors up to about 10', h('sup', null, '308'), '.'),
          h('p', null, 'There are cleverer methods than trial division, but for a well-chosen n of this size there is ', h('b', null, 'no known practical method on normal computers'), '. That gap is the lock.'),
          h('p', { class: 'dim' }, 'This number is an illustration of the size, not a real key. Textbook RSA with tiny numbers, like ours, is never safe.'));
        var showBtn = h('button', { type: 'button', class: 'btn btn-gold', 'data-bignum': '1', on: { click: runBig } }, 'Now try a real-size n');
        var st6 = h('div', { class: 'rsa-step', hidden: true }, h('h3', { class: 'rsa-h3' }, '6 · How big is a real n?'),
          h('div', { class: 'row' }, showBtn), ticker, counter, wrapped, sizeMsg);
        var bigAnim = null, raf = 0, bigDone = false;
        api.onExit(function () { if (bigAnim) bigAnim.cancel(); cancelAnimationFrame(raf); });
        function finishBig() {
          bigDone = true; track.parentNode.hidden = true;
          counter.textContent = '617 digits · 2048 bits'; wrapped.hidden = false; reveal(sizeMsg);
          IKS.anim.fadeUp(wrapped, { y: 8 });
          reveal(compare); reveal(finishRow);
        }
        function runBig() {
          if (bigDone || bigAnim) return;
          showBtn.disabled = true;
          if (api.reducedMotion || !track.animate) { finishBig(); return; }
          var tw = track.scrollWidth, vw = ticker.clientWidth, dur = 9000;
          bigAnim = track.animate([{ transform: 'translateX(' + vw + 'px)' }, { transform: 'translateX(' + (-tw) + 'px)' }], { duration: dur, easing: 'linear', fill: 'forwards' });
          function tick() {
            if (!api.alive()) return;
            var p = Math.min(1, (bigAnim.currentTime || 0) / dur);
            counter.textContent = Math.min(617, Math.round(p * (vw + tw) / tw * 617)) + ' digits';
            if (p < 1) raf = requestAnimationFrame(tick);
          }
          raf = requestAnimationFrame(tick);
          bigAnim.onfinish = function () { if (api.alive()) finishBig(); };
        }

        /* comparison + finish */
        var compare = h('section', { class: 'rsa-compare', hidden: true, 'aria-labelledby': 'rsa-cmp-h' },
          h('h3', { id: 'rsa-cmp-h', class: 'rsa-cmp-title' }, '💡 Why this fixes the shared-table problem'),
          h('div', { class: 'rsa-cmp-grid' },
            h('div', { class: 'rsa-cmp-col old' }, h('h4', null, 'Mūladevīya', h('small', null, 'one shared table')),
              h('ul', null, h('li', null, 'Both sides hold the same secret table.'), h('li', null, 'The table must travel to the other person.'), h('li', null, 'If it is stolen, every message opens.'), h('li', null, 'There is no separate key: the table is the key.'))),
            h('div', { class: 'rsa-cmp-col new' }, h('h4', null, 'RSA', h('small', null, 'a public lock and a private key')),
              h('ul', null, h('li', null, 'Anyone may hold the public lock.'), h('li', null, 'The private key never travels.'), h('li', null, 'Stealing the lock is useless: it only locks.'), h('li', null, 'Security comes from how hard it is to factor a huge n = p × q.')))),
          h('p', { class: 'rsa-use' }, 'Where it shows up: HTTPS certificates and digital signatures use ideas like this. RSA is one of several public-key algorithms in use today.'));
        var finishBtn = h('button', { type: 'button', class: 'btn btn-gold btn-lg', 'data-finish': '1', on: { click: function () { finishBtn.disabled = true; api.complete({ stars: L.finalStars(wrongs) }); } } }, 'Light the lamp');
        var finishRow = h('div', { class: 'row rsa-row-ctl', hidden: true }, finishBtn);

        a4.body.appendChild(intro);
        [st1, st2, st3, st4, st5, st6, compare, finishRow].forEach(function (n) { a4.body.appendChild(n); });
        reveal(st1);
      }

      /* ---------------------------------------------------------------- assemble */
      root.appendChild(stage);
      root.appendChild(api.explain('Why d exists, and why unlocking works', h('div', null,
        h('p', null, 'e and φ share no factor, so a hand that moves e places at a time can reach every spot on the clock of φ, including 1. The number of steps that lands on 1 is d, so e × d = 1 + (some laps × φ).'),
        h('p', null, 'Euler and Fermat showed that raising a number to the power 1 + k × φ brings it back to itself modulo n. So locking with e and then unlocking with d returns the original letter.'))));
      root.appendChild(api.explain('Why factoring is the lock', h('div', null,
        h('p', null, 'Everyone can see n and e. Getting d needs φ, and φ needs the two primes inside n. Multiplying two primes is quick; splitting the product back is the slow step once the primes are huge.'),
        h('p', null, 'Our numbers are tiny on purpose, so we can do every step by hand. Real use needs very large primes and careful padding. Nothing here is a safe way to protect anything.'))));
      root.appendChild(api.sourceBox(SOURCES));
      go(1);
      scene.play();
      return function cleanup() { /* timers and animations are registered with api.onExit */ };
    }
  });
})();
