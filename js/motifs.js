/**
 * Rahasya motif kit: clean inline SVG, flat colour + 2px gold line.
 * Load right after core.js. Every function returns a DOM node (SVG or DIV).
 * Colours come from CSS custom properties, so a motif adapts to its section:
 *   --m-fill   main flat colour       --m-line  line colour (default --gold)
 *   --m-accent accent colour          --m-soft  soft fill
 *
 *   IKS.motifs.archFrame({header})      stretchy multifoil (cusped) arch silhouette: game cards, level header
 *   IKS.motifs.arch({size})             standalone multifoil arch icon
 *   IKS.motifs.crackedArch({size})      arch with a crack that draws itself, shards drift (attack chapter)
 *   IKS.motifs.shikhara({size})         Nagara temple spire; class .is-in draws it
 *   IKS.motifs.gopuram({size})          Dravidian gateway tower
 *   IKS.motifs.lotus({size})            add class "is-open" to open it
 *   IKS.motifs.diya({lit,size})         same as IKS.ui.diya
 *   IKS.motifs.peacockEye({size})       feather eye (chapter marker)
 *   IKS.motifs.marigold({size})         single flower
 *   IKS.motifs.marigoldGarland()        DIV border strip
 *   IKS.motifs.palmLeaf({size})         palm-leaf bundle icon
 *   IKS.motifs.cipherWheel({size})      brass wheel carrying the Muladeviya pairs
 *   IKS.motifs.lock({open,size}) / .key({size})   brass lock and key
 *   IKS.motifs.ajrakhBand({height})     DIV, indigo + madder red block-print band
 *   IKS.motifs.blockPrint({height})     DIV, one-colour block-print strip (colour = currentColor)
 *   IKS.motifs.hairline()               DIV, gold hairline with lotus-bud terminals; add .is-in to draw
 *   IKS.motifs.jaali({glow})            DIV, pierced-screen lattice with drifting light
 *   IKS.motifs.kolam({loop})            SVG, dot-first kolam
 */
(function () {
  'use strict';
  var G = typeof window !== 'undefined' ? window : globalThis;
  if (typeof document === 'undefined' || !G.IKS) return;
  var IKS = G.IKS, el = IKS.el;
  var M = IKS.motifs = {};
  var uid = 0;
  function id(p) { return p + (++uid); }
  function sz(o, def) { return (o && o.size) || def; }
  function svg(vb, cls, o, w, h) {
    var s = el('svg', { viewBox: vb, class: cls, 'aria-hidden': 'true', focusable: 'false' });
    var size = sz(o, 0);
    if (size) { s.setAttribute('width', size); if (h) s.setAttribute('height', Math.round(size * h / w)); }
    return s;
  }
  function f(n) { return Math.round(n * 10) / 10; }

  /* multifoil arch outline in a 0..100 box (cusps point inward, lobes bulge out) */
  var ARCH_D = 'M2 100 L2 38 A9 9 0 0 1 12 27 A9 9 0 0 1 25 16 A13 13 0 0 1 50 3 A13 13 0 0 1 75 16 A9 9 0 0 1 88 27 A9 9 0 0 1 98 38 L98 100 Z';

  M.archFrame = function (o) {
    o = o || {};
    var s = el('svg', { class: 'arch-frame' + (o.header ? ' arch-header' : ''), viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' },
      el('path', { class: 'af-fill', d: ARCH_D }),
      el('path', { class: 'af-line', d: ARCH_D, 'vector-effect': 'non-scaling-stroke' }),
      el('path', { class: 'af-line af-inner', d: ARCH_D, 'vector-effect': 'non-scaling-stroke', transform: 'translate(50 100) scale(.94 .96) translate(-50 -100)' }));
    return s;
  };

  M.arch = function (o) {
    var s = svg('0 0 100 120', 'm-arch', o, 100, 120);
    s.appendChild(el('path', { class: 'm-fill', d: ARCH_D, transform: 'scale(1 1.18)' }));
    s.appendChild(el('path', { class: 'm-line', d: 'M20 118 V50 A30 30 0 0 1 80 50 V118', fill: 'none' }));
    return s;
  };

  M.crackedArch = function (o) {
    var s = svg('0 0 200 240', 'm-cracked', o, 200, 240);
    s.appendChild(el('path', { class: 'm-fill', d: 'M24 236 V96 A14 14 0 0 1 36 78 A14 14 0 0 1 56 58 A30 30 0 0 1 100 22 A30 30 0 0 1 144 58 A14 14 0 0 1 164 78 A14 14 0 0 1 176 96 V236Z' }));
    s.appendChild(el('path', { class: 'm-line', fill: 'none', d: 'M24 236 V96 A14 14 0 0 1 36 78 A14 14 0 0 1 56 58 A30 30 0 0 1 100 22 A30 30 0 0 1 144 58 A14 14 0 0 1 164 78 A14 14 0 0 1 176 96 V236' }));
    s.appendChild(el('path', { class: 'm-line m-inner', fill: 'none', d: 'M44 236 V104 A18 18 0 0 1 56 90 A28 28 0 0 1 100 46 A28 28 0 0 1 144 90 A18 18 0 0 1 156 104 V236' }));
    s.appendChild(el('path', { class: 'crack draw-on-in', pathLength: 1, fill: 'none', d: 'M100 22 L92 52 L108 74 L90 102 L110 130 L94 160 L106 190 L98 236' }));
    s.appendChild(el('polygon', { class: 'shard sh1', points: '70,120 84,112 80,132' }));
    s.appendChild(el('polygon', { class: 'shard sh2', points: '124,150 140,146 134,168' }));
    s.appendChild(el('polygon', { class: 'shard sh3', points: '86,196 98,190 96,208' }));
    return s;
  };

  /* cubic bezier point */
  function bez(p0, p1, p2, p3, t) {
    var u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
  }
  M.shikhara = function (o) {
    var s = svg('0 0 200 330', 'm-shikhara', o, 200, 330);
    var P0 = [58, 240], P1 = [62, 176], P2 = [78, 110], P3 = [100, 54];
    s.appendChild(el('path', { class: 'm-fill sk-body', d: 'M58 240 C62 176 78 110 100 54 C122 110 138 176 142 240Z' }));
    // ribs
    [0.55, 0.8].forEach(function (k) {
      var d = 'M' + f(100 + (P0[0] - 100) * k) + ' ' + P0[1] + ' C' + f(100 + (P1[0] - 100) * k) + ' ' + P1[1] + ' ' + f(100 + (P2[0] - 100) * k) + ' ' + P2[1] + ' 100 ' + P3[1];
      s.appendChild(el('path', { class: 'm-line thin draw-on-in', pathLength: 1, fill: 'none', d: d }));
      var d2 = 'M' + f(100 - (P0[0] - 100) * k) + ' ' + P0[1] + ' C' + f(100 - (P1[0] - 100) * k) + ' ' + P1[1] + ' ' + f(100 - (P2[0] - 100) * k) + ' ' + P2[1] + ' 100 ' + P3[1];
      s.appendChild(el('path', { class: 'm-line thin draw-on-in', pathLength: 1, fill: 'none', d: d2 }));
    });
    s.appendChild(el('path', { class: 'm-line draw-on-in', pathLength: 1, fill: 'none', d: 'M100 54 V240' }));
    // bhumi tier ticks
    for (var i = 1; i < 9; i++) {
      var t = i / 9.5, L = bez(P0, P1, P2, P3, t);
      s.appendChild(el('path', { class: 'm-line thin draw-on-in', pathLength: 1, fill: 'none', d: 'M' + f(L[0]) + ' ' + f(L[1]) + ' H' + f(200 - L[0]) }));
    }
    s.appendChild(el('path', { class: 'm-line draw-on-in', pathLength: 1, fill: 'none', d: 'M58 240 C62 176 78 110 100 54 C122 110 138 176 142 240' }));
    // amalaka + kalasha
    s.appendChild(el('ellipse', { class: 'm-soft m-line', cx: 100, cy: 48, rx: 20, ry: 7 }));
    s.appendChild(el('path', { class: 'm-line thin', fill: 'none', d: 'M86 46 V51 M93 44.5 V53 M100 44 V54 M107 44.5 V53 M114 46 V51' }));
    s.appendChild(el('path', { class: 'm-fill-acc m-line', d: 'M92 40 C87 32 91 24 100 24 C109 24 113 32 108 40Z' }));
    s.appendChild(el('path', { class: 'm-line', fill: 'none', d: 'M100 24 V8' }));
    s.appendChild(el('circle', { class: 'm-fill-acc', cx: 100, cy: 7, r: 3 }));
    // sanctum + door
    s.appendChild(el('rect', { class: 'm-fill', x: 54, y: 240, width: 92, height: 46 }));
    s.appendChild(el('rect', { class: 'm-line', fill: 'none', x: 54, y: 240, width: 92, height: 46 }));
    s.appendChild(el('path', { class: 'm-line', fill: 'none', d: 'M90 286 V262 A10 10 0 0 1 110 262 V286' }));
    // plinth steps
    s.appendChild(el('rect', { class: 'm-fill', x: 38, y: 286, width: 124, height: 14 }));
    s.appendChild(el('rect', { class: 'm-fill', x: 24, y: 300, width: 152, height: 16 }));
    s.appendChild(el('path', { class: 'm-line', fill: 'none', d: 'M38 286 H162 M24 300 H176 M24 316 H176 M24 300 V316 M176 300 V316' }));
    return s;
  };

  M.gopuram = function (o) {
    var s = svg('0 0 220 300', 'm-gopuram', o, 220, 300);
    var tiers = 6, y = 276, w = 188, h = 34;
    for (var i = 0; i < tiers; i++) {
      var x = (220 - w) / 2;
      s.appendChild(el('rect', { class: 'm-fill', x: f(x), y: f(y - h), width: w, height: h }));
      s.appendChild(el('rect', { class: 'm-line', fill: 'none', x: f(x), y: f(y - h), width: w, height: h }));
      var n = Math.max(2, 7 - i);
      for (var k = 0; k < n; k++) {
        var cx = x + (w / (n + 1)) * (k + 1);
        s.appendChild(el('path', { class: 'm-line thin', fill: 'none', d: 'M' + f(cx - 5) + ' ' + f(y) + ' V' + f(y - 16) + ' A5 5 0 0 1 ' + f(cx + 5) + ' ' + f(y - 16) + ' V' + f(y) }));
      }
      y -= h; w -= 26;
    }
    s.appendChild(el('path', { class: 'm-fill-acc m-line', d: 'M70 ' + f(y) + ' C70 ' + f(y - 26) + ' 150 ' + f(y - 26) + ' 150 ' + f(y) + 'Z' }));
    [80, 110, 140].forEach(function (cx) {
      s.appendChild(el('path', { class: 'm-line', fill: 'none', d: 'M' + cx + ' ' + f(y - 17) + ' V' + f(y - 28) }));
      s.appendChild(el('circle', { class: 'm-fill-acc', cx: cx, cy: f(y - 30), r: 3 }));
    });
    s.appendChild(el('path', { class: 'm-line', fill: 'none', d: 'M14 276 H206' }));
    return s;
  };

  M.lotus = function (o) {
    var s = svg('0 0 100 100', 'lotus', o, 100, 100);
    var n = 0;
    function petal(rot, cls, scale) {
      s.appendChild(el('path', { class: 'petal ' + cls, d: 'M50 88 C37 72 37 40 50 14 C63 40 63 72 50 88Z', style: { '--rot': rot + 'deg', '--n': n++, '--s': scale || 1 } }));
    }
    [-70, -47, -23, 23, 47, 70].forEach(function (r) { petal(r, 'petal-b'); });
    petal(0, 'petal-b');
    [-36, -12, 12, 36].forEach(function (r) { petal(r, 'petal-f', 0.88); });
    s.appendChild(el('circle', { class: 'lotus-core', cx: 50, cy: 74, r: 5 }));
    s.appendChild(el('path', { class: 'lotus-water', d: 'M14 90 Q50 82 86 90', fill: 'none' }));
    return s;
  };

  M.diya = function (o) { return IKS.ui.diya(o); };

  M.peacockEye = function (o) {
    var s = svg('0 0 40 64', 'm-eye', o, 40, 64);
    s.appendChild(el('path', { class: 'eye-1', d: 'M20 2 C34 16 36 40 20 62 C4 40 6 16 20 2Z' }));
    s.appendChild(el('path', { class: 'eye-2', d: 'M20 14 C29 24 30 38 20 52 C10 38 11 24 20 14Z' }));
    s.appendChild(el('ellipse', { class: 'eye-3', cx: 20, cy: 33, rx: 6, ry: 8 }));
    s.appendChild(el('ellipse', { class: 'eye-4', cx: 20, cy: 33, rx: 2.6, ry: 3.6 }));
    return s;
  };

  M.marigold = function (o) {
    var s = svg('0 0 60 60', 'm-marigold', o, 60, 60);
    var i, ring;
    for (ring = 0; ring < 2; ring++) {
      var r = ring ? 12 : 19, n = ring ? 10 : 12, rad = ring ? 8 : 10;
      for (i = 0; i < n; i++) {
        var a = (i / n) * Math.PI * 2 + (ring ? 0.26 : 0);
        s.appendChild(el('circle', { class: ring ? 'mg-b' : 'mg-a', cx: f(30 + Math.cos(a) * r), cy: f(30 + Math.sin(a) * r), r: rad }));
      }
    }
    s.appendChild(el('circle', { class: 'mg-c', cx: 30, cy: 30, r: 6 }));
    return s;
  };
  M.marigoldGarland = function () { return el('div', { class: 'marigold-garland', 'aria-hidden': 'true' }); };

  M.palmLeaf = function (o) {
    var s = svg('0 0 48 40', 'm-palm', o, 48, 40);
    for (var i = 0; i < 4; i++) {
      s.appendChild(el('rect', { class: 'pl-leaf pl-' + i, x: 3 + i * 1.2, y: 5 + i * 8, rx: 3.5, width: 42 - i * 1.2, height: 6.5 }));
    }
    s.appendChild(el('circle', { class: 'pl-hole', cx: 12, cy: 18, r: 1.8 }));
    s.appendChild(el('circle', { class: 'pl-hole', cx: 36, cy: 18, r: 1.8 }));
    s.appendChild(el('path', { class: 'pl-cord', d: 'M12 2 V38 M36 2 V38', fill: 'none' }));
    return s;
  };

  M.cipherWheel = function (o) {
    var s = svg('0 0 300 300', 'm-wheel', o, 300, 300);
    var A = ['a', 'kh', 'gh', 'c', 't', 'ñ', 'n', 'r', 'l', 'y'];
    var B = ['k', 'g', 'ṅ', 'ṭ', 'p', 'ṇ', 'm', 'ṣ', 's', 'ś'];
    var gid = id('brass');
    s.appendChild(el('defs', null, el('radialGradient', { id: gid, cx: '50%', cy: '40%', r: '70%' },
      el('stop', { offset: '0%', 'stop-color': '#3A3FA0' }), el('stop', { offset: '100%', 'stop-color': '#1A1D5C' }))));
    var g = el('g', { class: 'wheel-spin' });
    g.appendChild(el('circle', { cx: 150, cy: 150, r: 146, class: 'wh-disc', fill: 'url(#' + gid + ')' }));
    [146, 130, 96, 66, 30].forEach(function (r, i) { g.appendChild(el('circle', { cx: 150, cy: 150, r: r, class: 'wh-ring' + (i === 0 ? ' wh-strong' : '') })); });
    var i, a;
    for (i = 0; i < 60; i++) {
      a = i * 6;
      var long = i % 3 === 0;
      g.appendChild(el('line', { class: 'wh-tick', x1: 150, y1: long ? 6 : 9, x2: 150, y2: 14, transform: 'rotate(' + a + ' 150 150)' }));
    }
    for (i = 0; i < 10; i++) {
      a = i * 36;
      g.appendChild(el('text', { class: 'wh-a', x: 150, y: 62, 'text-anchor': 'middle', transform: 'rotate(' + a + ' 150 150)' }, A[i]));
      g.appendChild(el('text', { class: 'wh-b', x: 150, y: 94, 'text-anchor': 'middle', transform: 'rotate(' + a + ' 150 150)' }, B[i]));
      g.appendChild(el('line', { class: 'wh-spoke', x1: 150, y1: 100, x2: 150, y2: 112, transform: 'rotate(' + a + ' 150 150)' }));
    }
    g.appendChild(el('circle', { cx: 150, cy: 150, r: 10, class: 'wh-hub' }));
    g.appendChild(el('path', { class: 'wh-star', d: 'M150 134 L154 146 L166 150 L154 154 L150 166 L146 154 L134 150 L146 146Z' }));
    s.appendChild(g);
    return s;
  };

  function brass(defs, gid) {
    defs.appendChild(el('linearGradient', { id: gid, x1: '0', y1: '0', x2: '1', y2: '1' },
      el('stop', { offset: '0%', 'stop-color': '#F3DE8E' }), el('stop', { offset: '45%', 'stop-color': '#C9A227' }),
      el('stop', { offset: '100%', 'stop-color': '#8A6A12' })));
  }
  M.lock = function (o) {
    o = o || {};
    var gid = id('brl');
    var s = svg('0 0 140 180', 'm-lock' + (o.open ? ' is-open' : ''), o, 140, 180);
    var defs = el('defs'); brass(defs, gid); s.appendChild(defs);
    s.appendChild(el('path', { class: 'shackle', d: 'M38 84 V56 A32 32 0 0 1 102 56 V84', fill: 'none', stroke: 'url(#' + gid + ')', 'stroke-width': 14, 'stroke-linecap': 'round' }));
    s.appendChild(el('rect', { x: 14, y: 80, width: 112, height: 90, rx: 14, fill: 'url(#' + gid + ')' }));
    s.appendChild(el('rect', { x: 14, y: 80, width: 112, height: 90, rx: 14, fill: 'none', stroke: '#FFF3C4', 'stroke-opacity': 0.5, 'stroke-width': 2 }));
    s.appendChild(el('path', { d: 'M24 94 H116 M24 156 H116', stroke: '#6B4F0A', 'stroke-opacity': 0.35, 'stroke-width': 2 }));
    s.appendChild(el('circle', { cx: 70, cy: 118, r: 11, fill: '#2A1E04' }));
    s.appendChild(el('path', { d: 'M65 124 H75 L77 146 H63Z', fill: '#2A1E04' }));
    return s;
  };
  M.key = function (o) {
    var gid = id('brk');
    var s = svg('0 0 200 70', 'm-key', o, 200, 70);
    var defs = el('defs'); brass(defs, gid); s.appendChild(defs);
    s.appendChild(el('circle', { cx: 34, cy: 35, r: 26, fill: 'none', stroke: 'url(#' + gid + ')', 'stroke-width': 12 }));
    s.appendChild(el('circle', { cx: 34, cy: 35, r: 9, fill: 'url(#' + gid + ')' }));
    s.appendChild(el('rect', { x: 58, y: 29, width: 128, height: 12, rx: 6, fill: 'url(#' + gid + ')' }));
    s.appendChild(el('path', { d: 'M150 41 V58 H162 V41 M170 41 V52 H182 V41', fill: 'url(#' + gid + ')' }));
    return s;
  };

  M.ajrakhBand = function (o) { return el('div', { class: 'ajrakh', 'aria-hidden': 'true', style: o && o.height ? { height: o.height + 'px' } : null }); };
  M.blockPrint = function (o) { return el('div', { class: 'blockprint', 'aria-hidden': 'true', style: o && o.height ? { height: o.height + 'px' } : null }); };

  M.hairline = function () {
    function bud() {
      return el('svg', { class: 'hl-bud', viewBox: '0 0 20 20', 'aria-hidden': 'true', focusable: 'false' },
        el('path', { d: 'M10 2 C14 7 14 12 10 17 C6 12 6 7 10 2Z' }), el('path', { d: 'M3 10 H0 M17 10 H20', fill: 'none' }));
    }
    return el('div', { class: 'hairline', 'aria-hidden': 'true' }, bud(), el('span', { class: 'hl-line' }), bud());
  };

  M.jaali = function (o) {
    return el('div', { class: 'jaali', 'aria-hidden': 'true' }, (o && o.glow === false) ? null : el('span', { class: 'jaali-glow' }));
  };


  /* ================= pulli kolam: one closed mirror-curve around a 5x5 dot grid =================
     Generated offline: every cell of the (n+1)^2 grid bends the line around one diagonal pair of dots,
     boundary ends are paired outward; this solution is a single closed loop (checked). Grid spacing 40. */
  var KOLAM_D = 'M-20 -40 A20 20 0 0 0 0 -20 A20 20 0 0 1 20 0 A20 20 0 0 0 40 20 A20 20 0 0 0 60 0 A20 20 0 0 0 40 -20 A20 20 0 0 1 20 -40 A20 20 0 0 1 60 -40 A20 20 0 0 0 80 -20 A20 20 0 0 1 100 0 A20 20 0 0 1 80 20 A20 20 0 0 0 60 40 A20 20 0 0 0 80 60 A20 20 0 0 0 100 40 A20 20 0 0 1 120 20 A20 20 0 0 0 140 0 A20 20 0 0 0 120 -20 A20 20 0 0 1 100 -40 A20 20 0 0 1 140 -40 A20 20 0 0 0 160 -20 A20 20 0 0 0 180 -40 C180 -60 220 -20 200 -20 A20 20 0 0 0 180 0 A20 20 0 0 1 160 20 A20 20 0 0 0 140 40 A20 20 0 0 0 160 60 A20 20 0 0 0 180 40 A20 20 0 0 1 200 20 A20 20 0 0 1 200 60 A20 20 0 0 0 180 80 A20 20 0 0 1 160 100 A20 20 0 0 1 140 80 A20 20 0 0 0 120 60 A20 20 0 0 0 100 80 A20 20 0 0 0 120 100 A20 20 0 0 1 140 120 A20 20 0 0 0 160 140 A20 20 0 0 0 180 120 A20 20 0 0 1 200 100 A20 20 0 0 1 200 140 A20 20 0 0 0 180 160 A20 20 0 0 0 200 180 C220 180 180 220 180 200 A20 20 0 0 0 160 180 A20 20 0 0 1 140 160 A20 20 0 0 0 120 140 A20 20 0 0 0 100 160 A20 20 0 0 0 120 180 A20 20 0 0 1 140 200 A20 20 0 0 1 100 200 A20 20 0 0 0 80 180 A20 20 0 0 1 60 160 A20 20 0 0 1 80 140 A20 20 0 0 0 100 120 A20 20 0 0 0 80 100 A20 20 0 0 0 60 120 A20 20 0 0 1 40 140 A20 20 0 0 0 20 160 A20 20 0 0 0 40 180 A20 20 0 0 1 60 200 A20 20 0 0 1 20 200 A20 20 0 0 0 0 180 A20 20 0 0 0 -20 200 C-20 220 -60 180 -40 180 A20 20 0 0 0 -20 160 A20 20 0 0 1 0 140 A20 20 0 0 0 20 120 A20 20 0 0 0 0 100 A20 20 0 0 0 -20 120 A20 20 0 0 1 -40 140 A20 20 0 0 1 -40 100 A20 20 0 0 0 -20 80 A20 20 0 0 1 0 60 A20 20 0 0 1 20 80 A20 20 0 0 0 40 100 A20 20 0 0 0 60 80 A20 20 0 0 0 40 60 A20 20 0 0 1 20 40 A20 20 0 0 0 0 20 A20 20 0 0 0 -20 40 A20 20 0 0 1 -40 60 A20 20 0 0 1 -40 20 A20 20 0 0 0 -20 0 A20 20 0 0 0 -40 -20 C-60 -20 -20 -60 -20 -40Z';
  function buildKolam(svg, o) {
    o = o || {};
    svg.setAttribute('viewBox', '-100 -100 360 360');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('kolam', 'pk');
    svg.classList.add(o.loop ? 'loop' : 'draw');
    svg.textContent = '';
    var gid = id('kg');
    svg.appendChild(el('defs', null, el('linearGradient', { id: gid, gradientUnits: 'userSpaceOnUse', x1: -40, y1: -40, x2: 200, y2: 200 },
      el('stop', { offset: '0%', style: 'stop-color: var(--k-a)' }), el('stop', { offset: '50%', style: 'stop-color: var(--k-b)' }), el('stop', { offset: '100%', style: 'stop-color: var(--k-c)' }))));
    // rangoli colour layer: lotus petals between the compass tips, soft
    var col = el('g', { class: 'k-colour' });
    for (var k = 0; k < 8; k++) {
      col.appendChild(el('path', { class: 'k-petal k-petal-' + (k % 2), d: 'M80 80 C54 50 58 2 80 -34 C102 2 106 50 80 80Z', transform: 'rotate(' + (k * 45 + 22.5) + ' 80 80) translate(0 -22)', style: { '--i': k } }));
    }
    svg.appendChild(col);
    // outer ring of tiny pulli
    var ring = el('g', { class: 'k-ring' });
    for (var r = 0; r < 36; r++) {
      var a = r / 36 * Math.PI * 2;
      ring.appendChild(el('circle', { class: 'pulli pulli-s', cx: f(80 + Math.cos(a) * 170), cy: f(80 + Math.sin(a) * 170), r: 1.9, style: { '--i': 30 + (r % 12) } }));
    }
    svg.appendChild(ring);
    var g = el('g', { transform: 'rotate(45 80 80)' });
    var dots = [], i, j;
    for (i = 0; i < 5; i++) for (j = 0; j < 5; j++) dots.push([i * 40, j * 40, Math.abs(i - 2) + Math.abs(j - 2) + Math.hypot(i - 2, j - 2) * 0.01]);
    dots.sort(function (p, q) { return p[2] - q[2]; });
    dots.forEach(function (d, n) { g.appendChild(el('circle', { class: 'pulli', cx: d[0], cy: d[1], r: 3.3, style: { '--i': n } })); });
    g.appendChild(el('path', { class: 'k-glow', d: KOLAM_D, fill: 'none' }));
    g.appendChild(el('path', { class: 'k-line', d: KOLAM_D, pathLength: 1, fill: 'none', stroke: 'url(#' + gid + ')' }));
    svg.appendChild(g);
    return svg;
  }
  M.pulliKolam = function (o) { return buildKolam(el('svg', { class: 'kolam-svg' }), o); };
  M.kolam = M.pulliKolam;
  IKS.anim.drawKolam = buildKolam; // same signature as core's; celebration + hero now use the pulli loop

  /* ================= skyline: one continuous filled silhouette band ================= */
  var SK_W = 1600, SK_H = 320, SK_G = 282;
  function P(n) { return Math.round(n * 10) / 10; }
  function rectD(x, y, w, h) { return 'M' + P(x) + ' ' + P(y) + 'h' + P(w) + 'v' + P(h) + 'h' + P(-w) + 'Z'; }
  function ellD(cx, cy, rx, ry) { return 'M' + P(cx - rx) + ' ' + P(cy) + 'a' + P(rx) + ' ' + P(ry) + ' 0 1 0 ' + P(2 * rx) + ' 0a' + P(rx) + ' ' + P(ry) + ' 0 1 0 ' + P(-2 * rx) + ' 0Z'; }
  function archCut(S, cx, by, w, h) { S.cut.push({ d: ARCH_D, t: 'translate(' + P(cx - w / 2) + ' ' + P(by - h) + ') scale(' + P(w / 100) + ' ' + P(h / 100) + ')' }); }
  function kalasha(S, cx, y, s) {
    S.fill.push(ellD(cx, y - 3.2 * s, 2.8 * s, 3.4 * s), rectD(cx - 0.9 * s, y - 9 * s, 1.8 * s, 5 * s), ellD(cx, y - 10 * s, 1.5 * s, 1.5 * s));
  }
  function bz(p0, p1, p2, p3, t) {
    var u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
  }
  /* Nagara temple: jangha + curvilinear tower with bhumi-amalaka ribs, side urushringa, amalaka, kalasha */
  function nagara(S, cx, gy, w, h, o) {
    o = o || {};
    var jh = o.small ? 0 : h * 0.16, y0 = gy - jh, H = (h - jh) / 1.12;
    if (!o.small) {
      S.fill.push(rectD(cx - w * 0.64, gy - h * 0.04, w * 1.28, h * 0.04 + 3));
      S.fill.push(rectD(cx - w * 0.55, y0, w * 1.1, jh));
      archCut(S, cx, gy - h * 0.04, w * 0.22, jh * 0.72);
      nagara(S, cx - w * 0.42, y0 + 3, w * 0.5, H * 0.55 * 1.12, { small: true });
      nagara(S, cx + w * 0.42, y0 + 3, w * 0.5, H * 0.55 * 1.12, { small: true });
      S.lit.push([cx - 1.5, y0 - 6, 3, 5]);
    }
    var P0 = [cx - w / 2, y0], C1 = [cx - w * 0.5, y0 - H * 0.36], C2 = [cx - w * 0.2, y0 - H * 0.72], P3 = [cx - w * 0.07, y0 - H * 0.9];
    S.fill.push('M' + P(P0[0]) + ' ' + P(P0[1]) + 'C' + P(C1[0]) + ' ' + P(C1[1]) + ' ' + P(C2[0]) + ' ' + P(C2[1]) + ' ' + P(P3[0]) + ' ' + P(P3[1]) +
      'L' + P(cx + w * 0.07) + ' ' + P(P3[1]) + 'C' + P(cx + w * 0.2) + ' ' + P(C2[1]) + ' ' + P(cx + w * 0.5) + ' ' + P(C1[1]) + ' ' + P(cx + w / 2) + ' ' + P(y0) + 'Z');
    var steps = o.small ? 5 : 8;
    for (var k = 1; k <= steps; k++) {
      var t = 0.08 + (k / (steps + 0.6)) * 0.84, L = bz(P0, C1, C2, P3, t), rx = w * 0.04 * (1 - t * 0.45);
      S.fill.push(ellD(L[0], L[1], rx, H * 0.021), ellD(2 * cx - L[0], L[1], rx, H * 0.021));
    }
    var ty = P3[1];
    S.fill.push(ellD(cx, ty, w * 0.2, H * 0.036), ellD(cx, ty - H * 0.04, w * 0.12, H * 0.022));
    kalasha(S, cx, ty - H * 0.05, Math.max(1.1, H / 95));
  }
  /* Dravidian gopuram: gate tier, tapering tiers with cornices and corner kutas, barrel vault, kalasha row */
  function gopuram(S, cx, gy, w, h) {
    var tiers = 7, base = h * 0.17, vault = h * 0.15, th = (h - base - vault - h * 0.07) / tiers;
    S.fill.push(rectD(cx - w * 0.57, gy - h * 0.035, w * 1.14, h * 0.035 + 3));
    var y = gy - h * 0.035;
    S.fill.push(rectD(cx - w * 0.5, y - base, w, base + 1));
    archCut(S, cx, y, w * 0.24, base * 0.8);
    S.lit.push([cx - 2, y - base * 0.5, 4, 6]);
    y -= base;
    var wi = w * 0.94, i, kk;
    for (i = 0; i < tiers; i++) {
      var wt = wi * 0.9;
      S.fill.push('M' + P(cx - wi / 2) + ' ' + P(y + 1) + 'L' + P(cx + wi / 2) + ' ' + P(y + 1) + 'L' + P(cx + wt / 2) + ' ' + P(y - th) + 'L' + P(cx - wt / 2) + ' ' + P(y - th) + 'Z');
      S.fill.push(rectD(cx - wi * 0.54, y - 2.5, wi * 1.08, 4));
      S.fill.push(ellD(cx - wi / 2 - 1, y - th * 0.55, 3.4, th * 0.34), ellD(cx + wi / 2 + 1, y - th * 0.55, 3.4, th * 0.34));
      if (i < 5) for (kk = -1; kk <= 1; kk++) archCut(S, cx + kk * wi * 0.24, y, wi * 0.13, th * 0.66);
      if (i % 2 === 1) S.lit.push([cx - 1.5, y - th * 0.55, 3, 4.5]);
      y -= th; wi = wt * 0.97;
    }
    var vw = wi * 0.9, vh = vault;
    S.fill.push('M' + P(cx - vw / 2) + ' ' + P(y + 1) + 'V' + P(y - vh * 0.5) + 'A' + P(vw / 2) + ' ' + P(vh * 0.5) + ' 0 0 1 ' + P(cx + vw / 2) + ' ' + P(y - vh * 0.5) + 'V' + P(y + 1) + 'Z');
    for (i = 0; i < 5; i++) kalasha(S, cx - vw * 0.4 + i * vw * 0.2, y - vh + (i === 2 ? -2 : 3), i === 2 ? 1.5 : 1.15);
  }
  function chhatri(S, cx, gy, w, h) {
    S.fill.push(rectD(cx - w / 2, gy - h * 0.16, w, h * 0.16 + 3));
    var px = [-0.42, -0.14, 0.14, 0.42];
    px.forEach(function (k) { S.fill.push(rectD(cx + k * w - w * 0.045, gy - h * 0.58, w * 0.09, h * 0.44)); });
    S.fill.push(rectD(cx - w * 0.52, gy - h * 0.62, w * 1.04, h * 0.07));
    S.fill.push('M' + P(cx - w * 0.5) + ' ' + P(gy - h * 0.62) + 'C' + P(cx - w * 0.5) + ' ' + P(gy - h * 0.9) + ' ' + P(cx - w * 0.2) + ' ' + P(gy - h * 0.88) + ' ' + P(cx) + ' ' + P(gy - h * 0.92) + 'C' + P(cx + w * 0.2) + ' ' + P(gy - h * 0.88) + ' ' + P(cx + w * 0.5) + ' ' + P(gy - h * 0.9) + ' ' + P(cx + w * 0.5) + ' ' + P(gy - h * 0.62) + 'Z');
    kalasha(S, cx, gy - h * 0.9, Math.max(0.9, h / 70));
  }
  /* Mughal gateway: iwan with a cusped arch, flanking chhatris and a dome behind */
  function gateway(S, cx, gy, w, h) {
    var dw = w * 0.5, dh = h * 0.5, dy = gy - h * 0.72;
    S.fill.push(rectD(cx - dw * 0.42, dy, dw * 0.84, h * 0.3));
    S.fill.push('M' + P(cx - dw * 0.5) + ' ' + P(dy) + 'C' + P(cx - dw * 0.64) + ' ' + P(dy - dh * 0.45) + ' ' + P(cx - dw * 0.2) + ' ' + P(dy - dh * 0.62) + ' ' + P(cx) + ' ' + P(dy - dh * 0.95) + 'C' + P(cx + dw * 0.2) + ' ' + P(dy - dh * 0.62) + ' ' + P(cx + dw * 0.64) + ' ' + P(dy - dh * 0.45) + ' ' + P(cx + dw * 0.5) + ' ' + P(dy) + 'Z');
    S.fill.push(ellD(cx, dy - 1, dw * 0.38, 2.6));
    kalasha(S, cx, dy - dh * 0.95, 1.5);
    S.fill.push(rectD(cx - w / 2, gy - h * 0.72 + h * 0.2, w, h * 0.72 - h * 0.2 + 3));
    S.fill.push(rectD(cx - w * 0.54, gy - h * 0.74 + h * 0.2, w * 1.08, 5));
    archCut(S, cx, gy, w * 0.4, h * 0.56);
    S.lit.push([cx - 2, gy - h * 0.18, 4, 7]);
    chhatri(S, cx - w * 0.38, gy - h * 0.72 + h * 0.2, w * 0.2, h * 0.3);
    chhatri(S, cx + w * 0.38, gy - h * 0.72 + h * 0.2, w * 0.2, h * 0.3);
  }
  function minar(S, cx, gy, w, h) {
    S.fill.push(rectD(cx - w / 2, gy - h * 0.9, w, h * 0.9 + 3), rectD(cx - w * 0.68, gy - h * 0.9, w * 1.36, 4), rectD(cx - w * 0.62, gy - h * 0.55, w * 1.24, 3));
    chhatri(S, cx, gy - h * 0.9, w * 2, h * 0.14);
  }

  function skylineSet(near) {
    var S = { fill: [], cut: [], lit: [] }, G = SK_G, x;
    S.fill.push(rectD(-10, G, SK_W + 20, SK_H - G + 10));
    if (near) {
      for (x = 6; x < SK_W; x += 17) S.fill.push('M' + x + ' ' + (G + 1) + 'V' + (G - 8) + 'Q' + (x + 6.5) + ' ' + (G - 19) + ' ' + (x + 13) + ' ' + (G - 8) + 'V' + (G + 1) + 'Z');
      for (x = 24, i = 0; x < SK_W; x += 46, i++) { archCut(S, x, SK_H + 4, 24, 34); if (i % 6 === 2) S.lit.push([x - 1.5, G + 14, 3, 6]); }
      nagara(S, 150, G, 76, 196); chhatri(S, 292, G, 40, 62); chhatri(S, 338, G, 28, 46);
      gopuram(S, 470, G, 150, 224); minar(S, 575, G, 9, 118);
      gateway(S, 690, G, 150, 142);
      nagara(S, 830, G, 104, 262);
      gopuram(S, 990, G, 124, 178); chhatri(S, 1090, G, 36, 58);
      gateway(S, 1195, G, 140, 124); minar(S, 1275, G, 9, 104);
      nagara(S, 1380, G, 84, 214);
      gopuram(S, 1535, G, 116, 150);
    } else {
      nagara(S, 70, G - 6, 56, 150); gopuram(S, 250, G - 6, 100, 150); nagara(S, 420, G - 6, 60, 170); minar(S, 540, G - 6, 8, 100);
      gateway(S, 640, G - 6, 110, 120); nagara(S, 1050, G - 6, 70, 190); gopuram(S, 1180, G - 6, 96, 140); nagara(S, 1330, G - 6, 52, 150);
      gateway(S, 1480, G - 6, 100, 110);
    }
    return S;
  }
  var i; // loop var for skylineSet
  M.skyline = function () {
    var uidn = id('sk');
    function layer(near) {
      var S = skylineSet(near);
      var s = el('svg', { class: 'sk-layer ' + (near ? 'sk-near' : 'sk-far'), viewBox: '0 0 ' + SK_W + ' ' + SK_H, preserveAspectRatio: 'xMidYMax slice', 'aria-hidden': 'true', focusable: 'false' });
      var g = el('g');
      if (near) S.fill.forEach(function (d) { g.appendChild(el('path', { class: 'sk-rim', d: d })); });
      S.fill.forEach(function (d) { g.appendChild(el('path', { class: 'sk-fill', d: d })); });
      if (near) {
        S.cut.forEach(function (c) { g.appendChild(el('path', { class: 'sk-cut', d: c.d, transform: c.t })); });
        S.lit.forEach(function (l) { g.appendChild(el('rect', { class: 'sk-lit', x: P(l[0]), y: P(l[1]), width: l[2], height: l[3], rx: 1.2 })); });
      }
      s.appendChild(g);
      return s;
    }
    return el('div', { class: 'skyline', 'aria-hidden': 'true', 'data-sk': uidn }, el('div', { class: 'sk-glow' }), layer(false), layer(true));
  };

  /* ================= Madhubani double-line frame: two gold lines, fine hatch between, lotus-bud corners =================
     Sized to its parent in pixels (ResizeObserver), so strokes stay uniform. Add .is-in on an ancestor to draw it. */
  M.frame = function () {
    var box = el('div', { class: 'mframe', 'aria-hidden': 'true' });
    var svg = el('svg', { class: 'mf-svg', focusable: 'false' });
    box.appendChild(svg);
    var last = '';
    function bud(x, y, rot) {
      return el('g', { transform: 'translate(' + x + ' ' + y + ') rotate(' + rot + ')' }, el('g', { class: 'mf-bud' },
        el('path', { class: 'mf-cap', d: 'M0 -8 L8 0 L0 8 L-8 0Z' }),
        el('path', { class: 'mf-petal', d: 'M6 6 C7 15 14 22 24 24 C22 14 15 7 6 6Z' }),
        el('path', { class: 'mf-curl', d: 'M13 0 C19 0 22 -3 22 -7 M0 13 C0 19 -3 22 -7 22', fill: 'none' }),
        el('circle', { class: 'mf-dot', cx: 27, cy: 27, r: 1.8 })));
    }
    function draw() {
      var w = Math.round(box.clientWidth), h = Math.round(box.clientHeight);
      if (!w || !h || w + 'x' + h === last) return;
      last = w + 'x' + h;
      svg.textContent = '';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      var o = 5, n = 15, b = 9; // outer inset, inner inset (gap between lines = n - o)
      function rectPath(i) { return 'M' + i + ' ' + i + 'H' + (w - i) + 'V' + (h - i) + 'H' + i + 'Z'; }
      var d = '', x, y;
      for (x = n + 14; x < w - n - 14; x += 5) d += 'M' + x + ' ' + (o + 1) + 'L' + (x + 4) + ' ' + (n - 1) + 'M' + x + ' ' + (h - o - 1) + 'L' + (x + 4) + ' ' + (h - n + 1);
      for (y = n + 14; y < h - n - 14; y += 5) d += 'M' + (o + 1) + ' ' + y + 'L' + (n - 1) + ' ' + (y + 4) + 'M' + (w - o - 1) + ' ' + y + 'L' + (w - n + 1) + ' ' + (y + 4);
      svg.appendChild(el('path', { class: 'mf-hatch', d: d, fill: 'none' }));
      svg.appendChild(el('path', { class: 'mf-line mf-outer', d: rectPath(o), pathLength: 1, fill: 'none' }));
      svg.appendChild(el('path', { class: 'mf-line mf-inner', d: rectPath(n), pathLength: 1, fill: 'none' }));
      svg.appendChild(bud(o, o, 0)); svg.appendChild(bud(w - o, o, 90)); svg.appendChild(bud(w - o, h - o, 180)); svg.appendChild(bud(o, h - o, 270));
    }
    if (typeof ResizeObserver === 'function') new ResizeObserver(draw).observe(box);
    else G.addEventListener('resize', draw);
    G.requestAnimationFrame(draw);
    return box;
  };

  /* ================= arch windows: each game's motif framed in a multifoil arch, gently animated ================= */
  function nest(g, node, x, y, w, h) {
    node.setAttribute('x', x); node.setAttribute('y', y); node.setAttribute('width', w); node.setAttribute('height', h);
    node.style.width = w + 'px'; node.style.height = h + 'px'; node.style.maxWidth = 'none';
    node.setAttribute('class', (node.getAttribute('class') || '') + ' win-n');
    g.appendChild(node); return node;
  }
  var SCENES = {
    chant: function (g) {
      g.appendChild(el('circle', { cx: 50, cy: 54, r: 34, fill: 'rgba(246,211,101,.10)' }));
      nest(g, M.shikhara(), 24, 20, 52, 86);
      ['agnim', 'īḷe', 'purohitam', 'yajñasya'].forEach(function (wd, k) {
        var w = wd.length * 3.2 + 6;
        g.appendChild(el('g', { transform: 'translate(50 98)' }, el('g', { class: 'cw', style: { '--k': k } },
          el('rect', { x: -w / 2, y: -4.5, width: w, height: 9, rx: 2, fill: '#FFF3C9', stroke: '#C9A227', 'stroke-width': .6 }),
          el('text', { x: 0, y: 1.8, 'text-anchor': 'middle', class: 'cw-t' }, wd))));
      });
    },
    cipher: function (g) {
      g.appendChild(el('circle', { cx: 50, cy: 112, r: 62, fill: 'rgba(201,162,39,.10)' }));
      nest(g, M.cipherWheel(), -16, 42, 132, 132);
    },
    breakit: function (g) {
      g.appendChild(el('path', { d: 'M20 120 V60 A30 30 0 0 1 80 60 V120', fill: 'none', stroke: 'rgba(233,215,154,.35)', 'stroke-width': .8 }));
      var d = 'M50 3.6 L44 26 L57 44 L43 64 L58 84 L46 104 L52 120';
      g.appendChild(el('path', { class: 'aw-crack-glow', d: d, fill: 'none' }));
      g.appendChild(el('path', { class: 'aw-crack', d: d, fill: 'none' }));
      g.appendChild(el('polygon', { class: 'aw-shard s1', points: '30,70 38,66 36,78' }));
      g.appendChild(el('polygon', { class: 'aw-shard s2', points: '64,92 72,88 70,100' }));
      g.appendChild(el('polygon', { class: 'aw-shard s3', points: '66,40 73,38 70,47' }));
    },
    rsa: function (g) {
      g.appendChild(el('circle', { cx: 50, cy: 66, r: 32, fill: 'rgba(242,162,12,.10)' }));
      nest(g, M.lock(), 29, 22, 42, 54);
      g.appendChild(el('g', { transform: 'rotate(-12 50 96)' }, el('g', { class: 'aw-key' }, nest(g, M.key(), 18, 84, 64, 22))));
    },
    spy: function (g) {
      g.appendChild(el('path', { d: 'M26 120 V64 A24 24 0 0 1 74 64 V120Z', fill: '#05050F', stroke: 'rgba(233,215,154,.5)', 'stroke-width': .8 }));
      g.appendChild(el('path', { d: 'M58 120 V66 A10 10 0 0 1 68 62 V120Z', fill: 'rgba(242,162,12,.4)' }));
      g.appendChild(el('path', { d: 'M38 120 C37 96 42 84 50 84 C58 84 63 96 62 120Z', fill: '#1B0A10' }));
      g.appendChild(el('path', { d: 'M50 58 C58 58 60 70 58 78 C54 74 46 74 42 78 C40 70 42 58 50 58Z', fill: '#2A0E16' }));
      g.appendChild(el('circle', { cx: 47, cy: 70, r: 1.3, fill: '#F2A20C' })); g.appendChild(el('circle', { cx: 53, cy: 70, r: 1.3, fill: '#F2A20C' }));
    },
    katapayadi: function (g) {
      nest(g, M.lock(), 36, 24, 28, 36);
      ['१', '७', '३'].forEach(function (dg, k) {
        g.appendChild(el('circle', { cx: 28 + k * 22, cy: 84, r: 9, fill: 'rgba(233,215,154,.12)', stroke: '#C9A227', 'stroke-width': .8 }));
        g.appendChild(el('text', { x: 28 + k * 22, y: 88, 'text-anchor': 'middle', class: 'aw-digit' }, dg));
      });
    },
    twilight: function (g) {
      g.appendChild(el('path', { d: 'M22 78 A28 28 0 0 1 78 78Z', fill: '#F2A20C' }));
      for (var r = 0; r < 7; r++) { var a = (-80 + r * 26.6) * Math.PI / 180; g.appendChild(el('line', { x1: 50 + Math.cos(a) * 34, y1: 78 + Math.sin(a) * 34, x2: 50 + Math.cos(a) * 44, y2: 78 + Math.sin(a) * 44, stroke: '#F6D365', 'stroke-width': 1.4, 'stroke-linecap': 'round' })); }
      g.appendChild(el('path', { d: 'M0 78 H100', stroke: 'rgba(233,215,154,.6)', 'stroke-width': .8 }));
      g.appendChild(el('path', { d: 'M10 88 q5 -3 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 M16 98 q5 -3 10 0 t10 0 t10 0 t10 0 t10 0 t10 0', fill: 'none', stroke: 'rgba(233,215,154,.4)', 'stroke-width': .8 }));
      g.appendChild(el('path', { d: 'M62 82 Q74 90 84 82 L81 86 Q73 90 65 86Z M72 82 V70 L80 80Z', fill: '#0B0B22' }));
    },
    where: function (g) {
      nest(g, M.lock(), 28, 22, 30, 39);
      g.appendChild(el('path', { d: 'M20 88 q6 -14 11 -2 t9 0 t9 -4 t12 2', fill: 'none', stroke: '#E9D79A', 'stroke-width': 1.6, 'stroke-linecap': 'round' }));
      g.appendChild(el('circle', { cx: 72, cy: 50, r: 9, fill: 'rgba(15,122,120,.9)', stroke: '#E9D79A', 'stroke-width': .9 }));
      g.appendChild(el('path', { d: 'M67.5 50 L71 54 L77 46', fill: 'none', stroke: '#fff', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    }
  };
  M.archWindow = function (kind) {
    var cid = id('awc'), gid = id('awg');
    var s = el('svg', { class: 'arch-win aw-' + kind, viewBox: '0 0 100 120', 'aria-hidden': 'true', focusable: 'false' });
    s.appendChild(el('defs', null,
      el('clipPath', { id: cid }, el('path', { d: ARCH_D, transform: 'scale(1 1.2)' })),
      el('radialGradient', { id: gid, cx: '50%', cy: '78%', r: '85%' }, el('stop', { offset: '0%', style: 'stop-color: var(--w1)' }), el('stop', { offset: '100%', style: 'stop-color: var(--w2)' }))));
    s.appendChild(el('path', { class: 'aw-bg', d: ARCH_D, transform: 'scale(1 1.2)', fill: 'url(#' + gid + ')' }));
    var g = el('g', { 'clip-path': 'url(#' + cid + ')' });
    if (SCENES[kind]) SCENES[kind](g);
    s.appendChild(g);
    s.appendChild(el('path', { class: 'aw-line', d: ARCH_D, transform: 'scale(1 1.2)', fill: 'none', 'vector-effect': 'non-scaling-stroke' }));
    s.appendChild(el('path', { class: 'aw-line aw-inner', d: ARCH_D, transform: 'translate(50 120) scale(.925 .935) translate(-50 -120) scale(1 1.2)', fill: 'none', 'vector-effect': 'non-scaling-stroke' }));
    return s;
  };

  /* ================= pass 2: story-chapter hero motifs ================= */
  var DEVA_STYLE = { fontFamily: 'var(--font-deva)' };

  /* ch1: a palm-leaf manuscript under a brass lens (darpan). Class .is-checked on any ancestor swaps CLAIM for SOURCE. */
  M.leafLens = function (o) {
    var s = svg('0 0 400 480', 'm-leaflens', o, 400, 480);
    var gA = id('llA'), gL = id('llL'), cid = id('llC'), bg = id('llB');
    s.appendChild(el('defs', null,
      el('linearGradient', { id: gA, x1: '0', y1: '0', x2: '0', y2: '1' }, el('stop', { offset: '0%', 'stop-color': '#FFF3C9' }), el('stop', { offset: '100%', 'stop-color': '#F2D26B' })),
      el('linearGradient', { id: gL, x1: '0', y1: '0', x2: '1', y2: '1' }, el('stop', { offset: '0%', 'stop-color': '#F3DE8E' }), el('stop', { offset: '45%', 'stop-color': '#C9A227' }), el('stop', { offset: '100%', 'stop-color': '#8A6A12' })),
      el('radialGradient', { id: bg, cx: '50%', cy: '70%', r: '80%' }, el('stop', { offset: '0%', 'stop-color': '#2D3A8C' }), el('stop', { offset: '100%', 'stop-color': '#12122B' })),
      el('clipPath', { id: cid }, el('circle', { cx: 0, cy: 0, r: 60 }))));
    s.appendChild(el('path', { d: ARCH_D, transform: 'scale(4 4.8)', fill: 'url(#' + bg + ')' }));
    s.appendChild(el('path', { class: 'll-arch', d: ARCH_D, transform: 'scale(4 4.8)', fill: 'none', 'vector-effect': 'non-scaling-stroke' }));
    s.appendChild(el('path', { class: 'll-arch ll-arch2', d: ARCH_D, transform: 'translate(200 480) scale(.93 .94) translate(-200 -480) scale(4 4.8)', fill: 'none', 'vector-effect': 'non-scaling-stroke' }));
    s.appendChild(el('circle', { cx: 200, cy: 300, r: 130, fill: 'rgba(246,211,101,.08)' }));
    s.appendChild(el('text', { class: 'll-pramana', x: 200, y: 108, 'text-anchor': 'middle', style: DEVA_STYLE }, 'प्रमाण'));
    s.appendChild(el('path', { class: 'll-rule', d: 'M150 124 H250', fill: 'none' }));
    s.appendChild(el('path', { class: 'll-bud', d: 'M200 128 C205 134 205 140 200 146 C195 140 195 134 200 128Z' }));
    function lines(g) {
      [[304, 'M92 0 H156 M164 0 H188 M196 0 H262 M270 0 H306'], [329, 'M92 0 H128 M136 0 H210 M218 0 H244 M252 0 H306'], [354, 'M92 0 H176 M184 0 H224 M232 0 H306'], [379, 'M92 0 H140 M148 0 H196 M204 0 H252']].forEach(function (r) {
        g.appendChild(el('path', { class: 'll-ink', d: r[1], transform: 'translate(0 ' + r[0] + ')', fill: 'none' }));
      });
    }
    var stack = el('g', { transform: 'rotate(-4 200 330)' });
    [[0, 1, '#E8C65A'], [1, 1, '#F0CE62']].forEach(function (L, i) {
      stack.appendChild(el('rect', { class: 'll-leaf', x: 34 + i * 6, y: 252 + i * 9, width: 332 - i * 10, height: 120, rx: 15, fill: L[2] }));
    });
    stack.appendChild(el('path', { class: 'll-cord', d: 'M74 240 V420 M326 240 V420', fill: 'none' }));
    stack.appendChild(el('rect', { class: 'll-leaf ll-front', x: 28, y: 270, width: 344, height: 138, rx: 16, fill: 'url(#' + gA + ')' }));
    var ink = el('g', { class: 'll-text' });
    lines(ink);
    stack.appendChild(ink);
    stack.appendChild(el('circle', { class: 'll-hole', cx: 74, cy: 339, r: 6 }));
    stack.appendChild(el('circle', { class: 'll-hole', cx: 326, cy: 339, r: 6 }));
    var st1 = el('g', { class: 'll-stamp ll-claim', transform: 'translate(298 298) rotate(-8)' }, el('rect', { x: -50, y: -15, width: 100, height: 30, rx: 3 }), el('text', { x: 0, y: 6, 'text-anchor': 'middle' }, 'CLAIM'));
    var st2 = el('g', { class: 'll-stamp ll-source', transform: 'translate(298 298) rotate(-8)' }, el('rect', { x: -56, y: -15, width: 112, height: 30, rx: 3 }), el('text', { x: 0, y: 6, 'text-anchor': 'middle' }, 'SOURCE ✓'));
    stack.appendChild(st1); stack.appendChild(st2);
    s.appendChild(stack);
    // lens: drifts over the leaf; inside the glass the same lines are magnified
    var lens = el('g', { class: 'll-lens', transform: 'translate(170 330)' });
    var inner = el('g', { 'clip-path': 'url(#' + cid + ')' });
    inner.appendChild(el('circle', { class: 'll-glass', cx: 0, cy: 0, r: 60 }));
    var mag = el('g', { class: 'll-mag', transform: 'scale(1.7) translate(-170 -330)' });
    var mrot = el('g', { transform: 'rotate(-4 200 330)' });
    mrot.appendChild(el('rect', { x: 28, y: 270, width: 344, height: 138, fill: '#FFF3C9' }));
    var mink = el('g', { class: 'll-text' }); lines(mink); mrot.appendChild(mink);
    mrot.appendChild(el('text', { class: 'll-q', x: 200, y: 372, 'text-anchor': 'middle' }, '?'));
    mag.appendChild(mrot); inner.appendChild(mag);
    lens.appendChild(inner);
    lens.appendChild(el('g', { transform: 'rotate(48)' }, el('rect', { x: 66, y: -9, width: 92, height: 18, rx: 9, fill: 'url(#' + gL + ')' }), el('rect', { x: 150, y: -11, width: 14, height: 22, rx: 5, fill: '#8A6A12' })));
    lens.appendChild(el('circle', { class: 'll-ring', cx: 0, cy: 0, r: 64, fill: 'none', stroke: 'url(#' + gL + ')', 'stroke-width': 11 }));
    lens.appendChild(el('path', { d: 'M-40 -30 A50 50 0 0 1 -12 -52', fill: 'none', stroke: '#fff', 'stroke-opacity': .55, 'stroke-width': 4, 'stroke-linecap': 'round' }));
    s.appendChild(lens);
    return s;
  };

  /* ch2: carved arched niche for a sorter bin (stretchy, like archFrame). Keeps af-* classes so bin CSS applies. */
  M.niche = function () {
    return el('svg', { class: 'arch-frame niche-frame', viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' },
      el('path', { class: 'af-fill', d: ARCH_D }),
      el('path', { class: 'nc-recess', d: ARCH_D, transform: 'translate(50 100) scale(.86 .9) translate(-50 -100)' }),
      el('path', { class: 'nc-shade', d: 'M14 100 V40 A8 8 0 0 1 22 31 A8 8 0 0 1 32 22 A12 12 0 0 1 50 14', transform: 'translate(50 100) scale(.86 .9) translate(-50 -100)', 'vector-effect': 'non-scaling-stroke', fill: 'none' }),
      el('path', { class: 'af-line', d: ARCH_D, 'vector-effect': 'non-scaling-stroke' }),
      el('path', { class: 'af-line af-inner', d: ARCH_D, 'vector-effect': 'non-scaling-stroke', transform: 'translate(50 100) scale(.94 .96) translate(-50 -100)' }),
      el('path', { class: 'nc-sill', d: 'M0.5 100 H99.5', 'vector-effect': 'non-scaling-stroke' }));
  };
  var NICHE_SYM = {
    integrity: '<path d="M24 4C28 13 32 23 33 41H15C16 23 20 13 24 4Z"/><path d="M24 4V41M19 17H29M17.5 26H30.5M16.5 34H31.5" stroke-width="1.3"/><path d="M18.5 30.5L23 35L30.5 24" stroke="var(--sym-acc)" stroke-width="3"/>',
    confidentiality: '<path d="M24 5C31 13 31 29 24 42C17 29 17 13 24 5Z"/><path d="M24 42C12 38 7 28 9 19C17 21 22 30 24 42Z"/><path d="M24 42C36 38 41 28 39 19C31 21 26 30 24 42Z"/><circle cx="24" cy="24" r="3.2" fill="var(--sym-acc)" stroke="none"/>',
    encoding: '<text x="24" y="37" text-anchor="middle" font-size="36" stroke="none" fill="currentColor" style="font-family:var(--font-deva)">७</text><path d="M7 43H41" stroke="var(--sym-acc)" stroke-width="2.4"/>',
    hidden: '<path d="M30 6A17 17 0 1 0 41 29A14 14 0 1 1 30 6Z"/><path d="M5 40q5-4 9 0t9 0t9 0t9 0" stroke="var(--sym-acc)" stroke-width="2.4"/><circle cx="35" cy="12" r="1.6" fill="currentColor" stroke="none"/>'
  };
  M.nicheSymbol = function (kind) {
    var s = el('svg', { class: 'niche-sym', viewBox: '0 0 48 48', 'aria-hidden': 'true', focusable: 'false', width: 34, height: 34 });
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', 2); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.innerHTML = NICHE_SYM[kind] || '';
    return s;
  };

  /* ch9: a six-petal jaali medallion with six missing pieces. s._set(k, on) fills / empties piece k. */
  M.brokenJaali = function (o) {
    var s = svg('0 0 320 320', 'm-bjaali', o, 320, 320), k, a;
    s.appendChild(el('circle', { class: 'bj-ring', cx: 160, cy: 160, r: 152, fill: 'none' }));
    s.appendChild(el('circle', { class: 'bj-ring bj-thin', cx: 160, cy: 160, r: 140, fill: 'none' }));
    for (k = 0; k < 48; k++) { a = k / 48 * Math.PI * 2; s.appendChild(el('circle', { class: 'bj-dot', cx: f(160 + Math.cos(a) * 146), cy: f(160 + Math.sin(a) * 146), r: k % 4 === 0 ? 2.6 : 1.5 })); }
    for (k = 0; k < 6; k++) {
      a = (k * 60 + 30 - 90) * Math.PI / 180;
      s.appendChild(el('path', { class: 'bj-diamond', d: 'M' + f(160 + Math.cos(a) * 110) + ' ' + f(160 + Math.sin(a) * 110 - 12) + ' l7 12 l-7 12 l-7 -12Z', transform: 'rotate(' + (k * 60 + 30) + ' ' + f(160 + Math.cos(a) * 110) + ' ' + f(160 + Math.sin(a) * 110) + ')' }));
    }
    var pieces = [];
    var PETAL = 'M0 -40 C20 -64 20 -104 0 -132 C-20 -104 -20 -64 0 -40Z';
    var NUM = ['१', '२', '३', '४', '५', '६'];
    for (k = 0; k < 6; k++) {
      var g = el('g', { class: 'bj-piece' }, el('path', { class: 'bj-body', d: PETAL }),
        el('path', { class: 'bj-vein', d: 'M0 -50 C4 -72 4 -100 0 -120 M-8 -64 C-14 -76 -12 -90 -6 -100 M8 -64 C14 -76 12 -90 6 -100', fill: 'none' }));
      s.appendChild(el('g', { transform: 'translate(160 160) rotate(' + (k * 60) + ')' }, g));
      a = (k * 60 - 90) * Math.PI / 180;
      s.appendChild(el('text', { class: 'bj-num', x: f(160 + Math.cos(a) * 84), y: f(160 + Math.sin(a) * 84 + 9), 'text-anchor': 'middle', style: DEVA_STYLE }, NUM[k]));
      pieces.push(g);
    }
    s.appendChild(el('circle', { class: 'bj-hub', cx: 160, cy: 160, r: 30 }));
    s.appendChild(el('path', { class: 'bj-star', d: 'M160 140 L165 155 L180 160 L165 165 L160 180 L155 165 L140 160 L155 155Z' }));
    s._set = function (i, on) { if (pieces[i]) pieces[i].classList.toggle('is-found', !!on); };
    s._hint = function (i, on) { if (pieces[i]) pieces[i].classList.toggle('is-hint', !!on); };
    return s;
  };

  /* ch10: a tied palm-leaf bundle (pothi) with a stylus writing a fresh leaf */
  M.palmBundle = function (o) {
    var s = svg('0 0 420 300', 'm-bundle', o, 420, 300), i;
    var gid = id('pbg');
    s.appendChild(el('defs', null, el('linearGradient', { id: gid, x1: '0', y1: '0', x2: '1', y2: '1' }, el('stop', { offset: '0%', 'stop-color': '#F3DE8E' }), el('stop', { offset: '50%', 'stop-color': '#C9A227' }), el('stop', { offset: '100%', 'stop-color': '#8A6A12' }))));
    s.appendChild(el('ellipse', { class: 'pb-shadow', cx: 210, cy: 266, rx: 190, ry: 11 }));
    // lower board
    s.appendChild(el('rect', { class: 'm-fill', x: 22, y: 224, width: 376, height: 34, rx: 9 }));
    s.appendChild(el('rect', { class: 'm-line', fill: 'none', x: 22, y: 224, width: 376, height: 34, rx: 9 }));
    s.appendChild(el('path', { class: 'm-line thin', fill: 'none', d: 'M40 241 H380' }));
    // the leaves
    var tones = ['#F6D365', '#EBC759', '#F8DC7E', '#E8C050', '#F6D365', '#F0CF63'];
    for (i = 0; i < 6; i++) {
      s.appendChild(el('rect', { class: 'pb-leaf', x: 34 + (i % 2 ? 4 : 0), y: 130 + i * 15.5, width: 352 - (i % 2 ? 8 : 0) - (i === 2 ? 6 : 0), height: 13, rx: 5, fill: tones[i] }));
    }
    // upper board
    s.appendChild(el('rect', { class: 'm-fill', x: 22, y: 96, width: 376, height: 34, rx: 9 }));
    s.appendChild(el('rect', { class: 'm-line', fill: 'none', x: 22, y: 96, width: 376, height: 34, rx: 9 }));
    s.appendChild(el('path', { class: 'm-line thin', fill: 'none', d: 'M40 113 H168 M252 113 H380' }));
    s.appendChild(el('path', { class: 'm-fill-acc m-line', d: 'M210 100 L226 113 L210 126 L194 113Z' }));
    // cord: wraps the bundle, knot on top, two tails with beads
    s.appendChild(el('path', { class: 'pb-cord', d: 'M118 92 V262 M130 92 V262', fill: 'none' }));
    s.appendChild(el('path', { class: 'pb-cord', d: 'M124 100 C150 82 196 84 226 92', fill: 'none' }));
    s.appendChild(el('circle', { class: 'pb-knot', cx: 124, cy: 94, r: 9 }));
    s.appendChild(el('path', { class: 'pb-cord', d: 'M124 100 C112 150 86 188 70 244 M124 100 C132 160 104 200 100 258', fill: 'none' }));
    s.appendChild(el('circle', { class: 'pb-bead', cx: 70, cy: 246, r: 6 })); s.appendChild(el('circle', { class: 'pb-bead', cx: 100, cy: 260, r: 6 }));
    // fresh leaf being written, with the stylus
    var fresh = el('g', { transform: 'rotate(-5 250 64)' });
    fresh.appendChild(el('rect', { class: 'pb-fresh', x: 120, y: 40, width: 270, height: 38, rx: 12 }));
    fresh.appendChild(el('circle', { class: 'pb-hole', cx: 140, cy: 59, r: 4.5 })); fresh.appendChild(el('circle', { class: 'pb-hole', cx: 372, cy: 59, r: 4.5 }));
    fresh.appendChild(el('path', { class: 'pb-ink', d: 'M164 50 H206 M214 50 H238 M164 68 H188 M196 68 H246 M254 68 H270', fill: 'none' }));
    s.appendChild(fresh);
    s.appendChild(el('g', { class: 'pb-stylus', transform: 'translate(262 56) rotate(-32)' },
      el('path', { class: 'pb-steel', d: 'M0 0 L26 -4 L26 4Z' }),
      el('rect', { class: 'pb-wood', x: 26, y: -6, width: 150, height: 12, rx: 6 }),
      el('path', { class: 'pb-band', d: 'M44 -6 V6 M52 -6 V6 M60 -6 V6', fill: 'none' }),
      el('circle', { class: 'pb-bead', cx: 180, cy: 0, r: 5.5 })));
    return s;
  };

  /* tiny single-colour glyphs (currentColor) for the sorter cards */
  var GLYPHS = {
    wave: '<path d="M4 10q3-5 6 0t6 0 6 0M4 17q3-5 6 0t6 0 6 0M4 24q3-5 6 0t6 0 6 0" fill="none"/>',
    diya: '<path d="M5 19H27C27 25 22 28 16 28C10 28 5 25 5 19Z" fill="currentColor"/><path d="M16 4C20 9 20 14 16 17C12 14 12 9 16 4Z" fill="none"/>',
    feather: '<path d="M16 3C25 11 26 22 16 29C6 22 7 11 16 3Z" fill="none"/><ellipse cx="16" cy="17" rx="4" ry="5.5" fill="currentColor"/>',
    scroll: '<path d="M7 6H25V22H7Z" fill="none"/><path d="M10 11H22M10 15H22M10 19H16" fill="none"/><circle cx="23" cy="24" r="4" fill="currentColor"/>',
    quill: '<path d="M25 5C14 7 9 14 8 24L7 28L11 26C19 25 24 18 25 5Z" fill="none"/><path d="M8 24L18 14" fill="none"/>',
    swap: '<path d="M5 11H25M20 6L26 11L20 16M27 21H7M12 16L6 21L12 26" fill="none"/>',
    digits: '<text x="16" y="23" text-anchor="middle" font-size="15" fill="currentColor" stroke="none" style="font-family:var(--font-deva)">१२३</text>',
    twilight: '<path d="M3 23H29M8 27H24M8 23A8 8 0 0 1 24 23M16 8V11M6 12L8.5 14.5M26 12L23.5 14.5" fill="none"/>'
  };
  M.glyph = function (name, size) {
    var s = el('svg', { class: 'glyph', viewBox: '0 0 32 32', 'aria-hidden': 'true', focusable: 'false', width: size || 28, height: size || 28 });
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', 1.9); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.innerHTML = GLYPHS[name] || '';
    return s;
  };
})();
