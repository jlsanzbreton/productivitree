// Coloured-pencil living tree drawn on a 2D canvas.
// Branch = project, leaf = task, fruit = final product, sun = purpose, roots = passions,
// trunk = experience. Names are carved into the bark. Click a branch to zoom in.
// Plain JS (no React) so it can run its own animation loop; the React view feeds it a model
// (see utils/livingTreeModel.js) and listens to clicks through callbacks.

const DW = 1000;
const DH = 830;
const GY = 690;
const CX = 500;
const TH = 285;
const UP = -Math.PI / 2;
const PAPER = [244, 241, 232];
const LEAF = { fresh: [140, 208, 79], ok: [79, 148, 55], att: [210, 180, 68], dry: [154, 100, 50], done: [63, 95, 52] };

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, t))));
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const tv = (d, done) => (done ? -1 : d < 2 ? 0 : d < 4 ? 0.25 : d < 10 ? 0.6 : 1);
const leafCol = (v) =>
  v < 0
    ? LEAF.done
    : v < 0.25
      ? mix(LEAF.fresh, LEAF.ok, v / 0.25)
      : v < 0.6
        ? mix(LEAF.ok, LEAF.att, (v - 0.25) / 0.35)
        : mix(LEAF.att, LEAF.dry, (v - 0.6) / 0.4);
const hashId = (id) => {
  let h = 7;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 2147483646;
  return h + 1;
};
// Beech-grey bark at the foot, turning into the light green of the branches higher up.
const BEECH = [156, 155, 146];
const TRUNK_TOP = [184, 200, 156];
const trunkCol = (t) => mix(BEECH, TRUNK_TOP, Math.pow(Math.max(0, Math.min(1, t)), 1.25));
const BAND0 = 0.06;
const BAND = 0.11;
const trunkAt = (t) => ({ x: CX + Math.sin(t * Math.PI) * 10 - t * 6, y: GY - t * TH, w: 72 - t * 42 });
const hand = (px, b) => `${b ? 700 : 500} ${px}px Caveat, "Bradley Hand", "Segoe Print", cursive`;

export const leafStateLabel = (task) =>
  task.done ? 'Hecha' : task.d < 2 ? 'Nueva' : task.d < 4 ? 'Sana' : task.d < 10 ? 'Pide atención' : 'Olvidada';
export const leafStateColor = (task) =>
  task.done ? '#3f5f34' : task.d < 2 ? '#8cd04f' : task.d < 4 ? '#4f9437' : task.d < 10 ? '#d2b444' : '#9a6432';

/**
 * @param {HTMLCanvasElement} cv
 * @param {{container: HTMLElement, tip?: HTMLElement, onBranch?: Function, onLeaf?: Function, onFruit?: Function, onBackground?: Function, onZoom?: Function}} opts
 */
export function createLivingTree(cv, opts) {
  const fig = opts.container;
  const tipEl = opts.tip || null;
  const mainCtx = cv.getContext('2d');
  let ctx = mainCtx;
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  let model = { purpose: '', roots: [], trunk: [], branches: [] };
  let P = [];
  let segs = [];
  let tips = [];
  let fall = [];
  let LQ = [];
  let LC = {};
  let W = 0;
  let H = 0;
  let k = 1;
  let K = 1;
  let dpr = 1;
  let hover = null;
  let hoverLeaf = null;
  let selBranch = null;
  let selLeaf = null;
  let selFruit = null;
  let selTrunk = null;
  let hoverTrunk = null;
  let hoverRoot = null;
  let selRoot = null;
  let hoverSun = false;
  let hintT = null; // guide hint: 'sun' | 'roots' | 'trunk' | 'branch'
  let rootPts = [];
  let zoomed = null;
  let settled = true;
  let focusA = 0;
  let swayK = 1;
  let noise = null;
  let bgC = null;
  let bgKey = '';
  let raf = 0;
  let last = 0;
  let alive = true;
  let firstModel = true;
  let rightInset = 0; // px covered on the right (task drawer): zoom keeps the branch in the visible part
  const cam = { fx: DW / 2, fy: DH / 2, z: 1 };
  const goal = { fx: DW / 2, fy: DH / 2, z: 1 };
  const memory = new Map(); // branch id -> { g, pz, bud, v: Map(task id -> v) }

  let seed = 7;
  const rnd = (a = 0, b = 1) => {
    seed = (seed * 16807) % 2147483647;
    return a + ((b - a) * (seed - 1)) / 2147483646;
  };
  const pDays = (p) => Math.min(...p.tasks.filter((t) => !t.done).map((t) => t.d).concat([99]));

  // ---------- geometry
  function layout(t) {
    for (const s of segs) {
      const sway = reduce ? 0 : (Math.sin(t * 0.0009 + s.ph + s.d * 0.6) * 0.006 * (s.d + 1) + Math.sin(t * 0.00037) * 0.008) * swayK;
      if (s.par < 0) {
        const tp = trunkAt(s.p.t);
        s.x0 = tp.x + (s.ox || 0) * tp.w;
        s.y0 = tp.y + (s.oy || 0) * tp.w;
        s.A = s.a + sway;
      } else {
        const q = segs[s.par];
        s.x0 = q.x1;
        s.y0 = q.y1;
        s.A = q.A + (s.a - q.a) + sway;
      }
      const gf = s.p.g >= 1 ? 1 : Math.max(0, Math.min(1, s.p.g * (s.p.md + 1) - s.d));
      s.x1 = s.x0 + Math.cos(s.A) * s.len * gf;
      s.y1 = s.y0 + Math.sin(s.A) * s.len * gf;
    }
  }

  function anchorTask(t) {
    const q = segs[t.s];
    if (!q) return;
    const a = q.A + t.off;
    t.right = Math.cos(q.a + t.off) >= 0;
    t.sx = q.x1 + Math.cos(a) * t.sz * 1.05 + (t.right ? 8 : -8);
    t.sy = q.y1 + Math.sin(a) * t.sz * 0.9;
  }

  function growProject(p) {
    seed = hashId(p.id);
    const a0 =
      p.side === 0 ? UP - 0.12 + rnd(-0.05, 0.05) : UP + p.side * (p.t > 0.8 ? 0.62 : p.t > 0.6 ? 0.95 : 1.18) + rnd(-0.05, 0.05);
    const L = ((p.young ? 72 : 98) + p.prio * 14) * (p.paused ? 0.75 : 1);
    const w = (p.young ? 11 : 12) + p.prio * 3.4;
    const md = p.young ? 2 : p.prio > 3 ? 4 : 3;
    p.md = md;
    p.segStart = segs.length;
    const grow = (par, a, len, w0, d) => {
      const bend = rnd(-0.2, 0.2);
      const wm = w0 * 0.86;
      const ia = segs.length;
      segs.push({ par, a, len: len * 0.5, w0, w1: wm, d, p, ph: rnd(0, 6.28) });
      const i = segs.length;
      segs.push({ par: ia, a: a + bend, len: len * 0.5, w0: wm, w1: Math.max(0.9, w0 * 0.7), d, p, ph: rnd(0, 6.28) });
      a += bend * 0.6;
      if (d >= md) {
        tips.push(i);
        return;
      }
      const pull = (UP - a) * 0.06;
      grow(i, a + pull + rnd(-0.2, 0.2), len * rnd(0.72, 0.82), w0 * 0.72, d + 1);
      const sd = (i % 2 ? 1 : -1) * (d === 0 ? -Math.sign(p.side || 1) : 1);
      grow(i, a + pull + sd * rnd(0.45, 0.8), len * rnd(0.56, 0.68), w0 * 0.56, d + 1);
      if (d === 1 && !p.young) grow(i, a + pull - sd * rnd(0.5, 0.75), len * rnd(0.46, 0.56), w0 * 0.5, d + 1);
    };
    // collar: the branch grows out of the trunk's flank, rising with it and then bending away
    const tw = trunkAt(p.t).w;
    const sg = p.side > 0 ? 1 : p.side < 0 ? -1 : 0;
    const da = a0 - UP;
    const cw = Math.min(tw * 0.9, w * 1.75);
    const c1 = segs.length;
    segs.push({ par: -1, a: UP + da * 0.22, len: tw * 0.42, w0: cw, w1: ((cw + w) / 2) * 1.04, d: 0, p, ph: rnd(0, 6.28), collar: 1, ox: sg * 0.12, oy: 0.28 });
    segs.push({ par: c1, a: UP + da * 0.62, len: tw * 0.36 + w * 0.25, w0: ((cw + w) / 2) * 1.04, w1: w * 1.02, d: 0, p, ph: rnd(0, 6.28), collar: 2 });
    grow(c1 + 1, a0, L, w, 0);
    p.segEnd = segs.length;
    const g0 = p.g;
    p.g = 1;
    for (let it = 0; it < 3; it++) {
      layout(0);
      let mnY = 1e9;
      let mnX = 1e9;
      let mxX = -1e9;
      for (let j = p.segStart; j < p.segEnd; j++) {
        const q = segs[j];
        mnY = Math.min(mnY, q.y1 - 26);
        mnX = Math.min(mnX, q.x1 - 26);
        mxX = Math.max(mxX, q.x1 + 26);
      }
      const f =
        Math.min(1, (GY - TH - 100) / Math.max(1, GY - TH - mnY), mnX < CX ? (CX - 16) / (CX - mnX) : 1, mxX > CX ? (DW - 16 - CX) / (mxX - CX) : 1) * 0.97;
      if (f >= 0.995) break;
      for (let j = p.segStart; j < p.segEnd; j++) if (!segs[j].collar) segs[j].len *= f;
    }
    layout(0);
    let bx0 = 1e9;
    let by0 = 1e9;
    let bx1 = -1e9;
    let by1 = -1e9;
    for (let j = p.segStart; j < p.segEnd; j++) {
      const q = segs[j];
      bx0 = Math.min(bx0, q.x0, q.x1);
      by0 = Math.min(by0, q.y0, q.y1);
      bx1 = Math.max(bx1, q.x0, q.x1);
      by1 = Math.max(by1, q.y0, q.y1);
    }
    p.bbox = [bx0, by0, bx1, by1];
    const my = tips.filter((i) => i >= p.segStart && i < p.segEnd);
    const n = p.tasks.length;
    p.tasks.forEach((t, j) => {
      t.s = my[Math.floor(((j + 0.5) * my.length) / n)];
      t.off = rnd(-0.7, 0.7);
      t.sz = rnd(26, 31);
      t.ph = rnd(0, 6.28);
    });
    p.tasks.forEach((t) => anchorTask(t));
    const used = new Set(p.tasks.map((t) => t.s));
    const free = my.filter((i) => !used.has(i));
    // A fruit hangs from the twig of the leaf it came from; the rest share the free twigs.
    // Fruits on the same twig are spread out so they never sit on top of each other.
    const pool = free.length ? free : my;
    const loose = p.fruits.filter((f) => !p.tasks.some((t) => t.id === f.from && t.s !== undefined));
    p.fruitTips = p.fruits.map((f) => {
      const leaf = p.tasks.find((t) => t.id === f.from && t.s !== undefined);
      if (leaf) return leaf.s;
      const k = loose.indexOf(f);
      return pool[Math.floor(((k + 0.5) * pool.length) / loose.length)];
    });
    const perTip = new Map();
    p.fruitOff = p.fruitTips.map((tip, j) => {
      const k = perTip.get(tip) || 0;
      perTip.set(tip, k + 1);
      const leaf = p.tasks.find((t) => t.id === p.fruits[j].from && t.s === tip);
      return { k, side: leaf ? (leaf.right ? -1 : 1) : 0 };
    });
    p.fruitOff.forEach((o, j) => {
      const m = perTip.get(p.fruitTips[j]);
      o.dx = o.side * 9 + (o.k - (m - 1) / 2) * 17;
      o.dy = 11 + (o.k % 2) * 9;
      o.ly = o.k * 16; // labels stacked, one line each
    });
    p.chain = [p.segStart];
    for (let j = p.segStart + 1; j < p.segEnd && segs[j].par === j - 1; j++) p.chain.push(j);
    // Labels of fruits sharing a twig stack in one column beside the outermost fruit.
    p.fs = p.fruitTips.map((i, j) => {
      if (!segs[i]) return null;
      const group = p.fruitOff.filter((_, h) => p.fruitTips[h] === i);
      const left = segs[i].x1 < CX;
      const edge = left ? Math.min(...group.map((o) => o.dx)) : Math.max(...group.map((o) => o.dx));
      return [segs[i].x1 + edge, segs[i].y1 + 11 + p.fruitOff[j].ly];
    });
    p.fx = [];
    p.g = g0;
  }

  function build() {
    segs = [];
    tips = [];
    P.forEach(growProject);
    layout(0);
    seed = 99;
    bgKey = '';
    LC = {};
  }

  function setModel(next) {
    // keep animation state (growth, paused fade, leaf colours) across updates
    P.forEach((p) => memory.set(p.id, { g: p.g, pz: p.pz, bud: p.bud, v: new Map(p.tasks.map((t) => [t.id, t.v])) }));
    model = next;
    P = next.branches.map((b) => {
      const m = memory.get(b.id);
      return {
        ...b,
        g: m ? m.g : firstModel ? 1 : 0,
        pz: m ? m.pz : b.paused ? 1 : 0,
        bud: m ? m.bud : 0,
        tasks: b.tasks.map((t) => ({ ...t, v: m && m.v.has(t.id) ? m.v.get(t.id) : tv(t.d, t.done) })),
        fruits: b.fruits.map((f) => ({ ...f })),
      };
    });
    firstModel = false;
    if (zoomed && !P.some((p) => p.id === zoomed)) zoomTo(null);
    build();
    if (zoomed) zoomTo(zoomed);
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = fig.clientWidth;
    H = fig.clientHeight;
    LC = {};
    bgKey = '';
    cv.width = Math.max(1, W * dpr);
    cv.height = Math.max(1, H * dpr);
    k = Math.min(W / DW, H / DH) * 1.02;
    if (!noise) {
      noise = document.createElement('canvas');
      noise.width = noise.height = 180;
      const nx = noise.getContext('2d');
      const id = nx.createImageData(180, 180);
      for (let i = 0; i < id.data.length; i += 4) {
        id.data[i] = id.data[i + 1] = id.data[i + 2] = 120;
        id.data[i + 3] = Math.random() * 40;
      }
      nx.putImageData(id, 0, 0);
    }
    if (zoomed) zoomTo(zoomed, true);
  }

  // ---------- writing on the drawing
  function label(str, x, y, size, opt = {}) {
    LQ.push([str, x, y, size, opt]);
  }
  function flushLabels() {
    const boxes = [];
    LQ.sort((a, b) => (a[4].q || 0) - (b[4].q || 0));
    for (const [str, x, y, size, opt] of LQ) {
      ctx.font = hand((size * 1.3) / K, opt.bold);
      const w = ctx.measureText(str).width + 22 / K;
      const h = (size + 6) / K;
      const al = opt.align || 'center';
      const x0 = (al === 'left' ? x : al === 'right' ? x - w : x - w / 2) - (al === 'left' ? 11 / K : al === 'right' ? -11 / K : 0);
      const key = str + '|' + (zoomed || '');
      let dy = LC[key];
      if (dy === undefined) {
        dy = 0;
        for (const c of [0, -1, 1, -2, 2, -3, 3]) {
          const yy = y + c * h;
          if (!boxes.some((b) => x0 < b[2] && x0 + w > b[0] && yy - h / 2 < b[3] && yy + h / 2 > b[1])) {
            dy = c * h;
            break;
          }
        }
        if (settled) LC[key] = dy;
      }
      boxes.push([x0, y + dy - h / 2, x0 + w, y + dy + h / 2]);
      ctx.textAlign = al;
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 4 / K;
      ctx.strokeStyle = 'rgba(244,241,232,.9)';
      ctx.strokeText(str, x, y + dy);
      ctx.fillStyle = opt.col || '#2f3027';
      ctx.fillText(str, x, y + dy);
    }
    LQ = [];
  }

  const GC = new Map();
  const WC = new Map();
  const CW = new Map();
  // Each cached glyph is a small canvas. While branches grow their width changes, so new
  // sizes keep appearing: cap the caches so a long session cannot pile up thousands of canvases.
  const MAX_GLYPHS = 600;
  const MAX_WARPED = 1200;
  const clearFontCaches = () => {
    GC.clear();
    WC.clear();
    CW.clear();
    bgKey = '';
  };
  if (document.fonts) {
    document.fonts.ready.then(clearFontCaches);
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', clearFontCaches);
  }
  function glyph(str, fs) {
    const key = str + '|' + fs;
    let g = GC.get(key);
    if (g) return g;
    if (GC.size >= MAX_GLYPHS) GC.clear();
    const S = 5;
    const c = document.createElement('canvas');
    const x = c.getContext('2d');
    x.font = hand(fs * S, 1);
    const w = Math.ceil(x.measureText(str).width / S) + 3;
    const h = Math.ceil(fs * 1.15) + 3;
    c.width = w * S;
    c.height = h * S;
    x.font = hand(fs * S, 1);
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = 'rgba(255,252,236,.9)';
    x.fillText(str, (w / 2 + 0.55) * S, (h / 2 + 0.8) * S);
    x.fillStyle = 'rgba(38,50,26,.9)';
    x.fillText(str, (w / 2) * S, (h / 2) * S);
    g = { c, w, h, S };
    GC.set(key, g);
    return g;
  }
  // The warped, shaded glyph is built once per (char, size, radius) so each frame is one drawImage per char.
  function warped(ch, fs, R, vert, glow) {
    const key = ch + '|' + fs + '|' + R + '|' + (vert ? 1 : 0) + '|' + (glow ? 1 : 0);
    let wg = WC.get(key);
    if (wg) return wg;
    if (WC.size >= MAX_WARPED) WC.clear();
    const g = glyph(ch, fs);
    const S = 4;
    const pad = glow ? 6 : 0;
    const c = document.createElement('canvas');
    const x = c.getContext('2d');
    c.width = (g.w + pad * 2) * S;
    c.height = (g.h + pad * 2) * S;
    x.scale(S, S);
    x.translate(pad + g.w / 2, pad + g.h / 2);
    if (glow) {
      x.shadowColor = 'rgba(255,206,84,1)';
      x.shadowBlur = 4.5 * S;
    }
    if (!R) {
      x.drawImage(g.c, -g.w / 2, -g.h / 2, g.w, g.h);
    } else {
      // convex cylinder of radius R: strips are squeezed towards the edges and shaded
      const N = 12;
      const span = vert ? g.w : g.h;
      const map = (v) => R * Math.sin(Math.max(-1.45, Math.min(1.45, v / R)));
      for (let i = 0; i < N; i++) {
        const s0 = -span / 2 + (span * i) / N;
        const s1 = s0 + span / N;
        const p0 = map(s0);
        const p1 = map(s1);
        const mid = (s0 + s1) / 2;
        x.globalAlpha = 0.72 + 0.28 * Math.cos(Math.min(1.45, Math.abs(mid / R)));
        if (vert) x.drawImage(g.c, ((i * g.w) / N) * g.S, 0, (g.w / N) * g.S + 1, g.c.height, p0, -g.h / 2, p1 - p0 + 0.06, g.h);
        else x.drawImage(g.c, 0, ((i * g.h) / N) * g.S, g.c.width, (g.h / N) * g.S + 1, -g.w / 2, p0, g.w, p1 - p0 + 0.06);
      }
    }
    wg = { c, w: g.w + pad * 2, h: g.h + pad * 2 };
    WC.set(key, wg);
    return wg;
  }
  function carveChar(ch, x, y, a, fsIn, RIn, vert, glow) {
    const fs = Math.round(fsIn * 2) / 2;
    const R = RIn ? Math.round(RIn * 2) / 2 : 0;
    const A0 = ctx.globalAlpha;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    if (glow) {
      const gw = warped(ch, fs, R, vert, true);
      ctx.globalAlpha = A0 * Math.min(1, glow);
      ctx.drawImage(gw.c, -gw.w / 2, -gw.h / 2, gw.w, gw.h);
      ctx.globalAlpha = A0;
    }
    const wg = warped(ch, fs, R, vert, false);
    ctx.drawImage(wg.c, -wg.w / 2, -wg.h / 2, wg.w, wg.h);
    ctx.restore();
    ctx.globalAlpha = A0;
  }
  const cw = (c, fs) => {
    const key = c + '|' + fs;
    let v = CW.get(key);
    if (v === undefined) {
      v = ctx.measureText(c).width * 0.94;
      CW.set(key, v);
    }
    return v;
  };
  // pts: [[x,y,w],...] from base outward; text reads left to right; w = branch width there (for curvature)
  function carveAlong(pts, str, fs, startGap, glow) {
    let p = pts;
    if (p[p.length - 1][0] < p[0][0]) p = p.slice().reverse();
    const cum = [0];
    for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    const total = cum[cum.length - 1];
    ctx.font = hand(fs, 1);
    const chars = [...str];
    const ws = chars.map((c) => cw(c, fs));
    const tw = ws.reduce((a, b) => a + b, 0);
    const rev = p !== pts;
    let s = rev ? total - startGap - tw : startGap;
    if (s < 2) s = 2;
    let i = 1;
    for (let c = 0; c < ws.length; c++) {
      const m = s + ws[c] / 2;
      while (i < p.length - 1 && cum[i] < m) i++;
      const u = (m - cum[i - 1]) / Math.max(0.001, cum[i] - cum[i - 1]);
      const x = p[i - 1][0] + (p[i][0] - p[i - 1][0]) * u;
      const y = p[i - 1][1] + (p[i][1] - p[i - 1][1]) * u;
      const a = Math.atan2(p[i][1] - p[i - 1][1], p[i][0] - p[i - 1][0]);
      const bw = p[i - 1][2] !== undefined ? p[i - 1][2] + (p[i][2] - p[i - 1][2]) * u : 0;
      if (chars[c] !== ' ') carveChar(chars[c], x, y, a, fs, bw ? Math.max(fs * 0.62, bw / 2) : 0, false, glow);
      s += ws[c];
    }
  }

  // ---------- drawing
  function quad(s) {
    const nx = -Math.sin(s.A);
    const ny = Math.cos(s.A);
    ctx.beginPath();
    ctx.moveTo(s.x0 + (nx * s.w0) / 2, s.y0 + (ny * s.w0) / 2);
    ctx.lineTo(s.x1 + (nx * s.w1) / 2, s.y1 + (ny * s.w1) / 2);
    ctx.lineTo(s.x1 - (nx * s.w1) / 2, s.y1 - (ny * s.w1) / 2);
    ctx.lineTo(s.x0 - (nx * s.w0) / 2, s.y0 - (ny * s.w0) / 2);
    ctx.closePath();
  }
  function branch(s, hi) {
    const p = s.p;
    const gc = mix([108, 150, 58], [150, 150, 140], p.pz);
    const base = mix(gc, PAPER, hi ? 0.3 : 0.46);
    const shade = mix(gc, [40, 62, 30], 0.25);
    const nx = -Math.sin(s.A);
    const ny = Math.cos(s.A);
    const sg = ny > 0 ? 1 : -1; // underside = shadow
    let fillS = rgb(base);
    let edgeA = 1;
    if (s.collar) {
      const TR = trunkCol(p.t);
      const gk = base.join();
      const moved = s.gx === undefined || Math.abs(s.gx - s.x0) + Math.abs(s.gy - s.y0) + Math.abs(s.gx1 - s.x1) + Math.abs(s.gy1 - s.y1) > 2;
      if (!moved && gk === s.gk && s.gctx === ctx) {
        fillS = s.gc;
      } else {
        const g = ctx.createLinearGradient(s.x0, s.y0, s.x1, s.y1);
        if (s.collar === 1) {
          g.addColorStop(0, rgb(TR, 0));
          g.addColorStop(0.45, rgb(TR, 0.96));
          g.addColorStop(1, rgb(mix(TR, base, 0.5)));
        } else {
          g.addColorStop(0, rgb(mix(TR, base, 0.5)));
          g.addColorStop(1, rgb(base));
        }
        Object.assign(s, { gx: s.x0, gy: s.y0, gx1: s.x1, gy1: s.y1, gk, gc: g, gctx: ctx });
        fillS = g;
      }
      edgeA = s.collar === 1 ? 0.35 : 0.8;
    }
    quad(s);
    ctx.fillStyle = fillS;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s.x1, s.y1, s.w1 / 2, 0, 6.283);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s.x0 + nx * sg * s.w0 * 0.1, s.y0 + ny * sg * s.w0 * 0.1);
    ctx.lineTo(s.x1 + nx * sg * s.w1 * 0.1, s.y1 + ny * sg * s.w1 * 0.1);
    ctx.lineTo(s.x1 + (nx * sg * s.w1) / 2, s.y1 + (ny * sg * s.w1) / 2);
    ctx.lineTo(s.x0 + (nx * sg * s.w0) / 2, s.y0 + (ny * sg * s.w0) / 2);
    ctx.closePath();
    ctx.fillStyle = rgb(shade, 0.28);
    ctx.fill();
    if (s.w0 > 5 && s.collar !== 1) {
      ctx.strokeStyle = rgb(shade, s.collar ? 0.3 : 0.45);
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      const n = Math.floor(s.len / 3.2);
      for (let j = 0; j < n; j++) {
        const u = (j + 0.5) / n;
        const w = s.w0 + (s.w1 - s.w0) * u;
        const cx = s.x0 + (s.x1 - s.x0) * u;
        const cy = s.y0 + (s.y1 - s.y0) * u;
        ctx.moveTo(cx + nx * sg * w * 0.18, cy + ny * sg * w * 0.18);
        ctx.lineTo(cx + nx * sg * w * 0.48 + Math.cos(s.A) * 2.2, cy + ny * sg * w * 0.48 + Math.sin(s.A) * 2.2);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = rgb(mix(gc, [34, 52, 26], 0.5), 0.9 * edgeA);
    ctx.lineWidth = hi ? 1.3 : 0.85;
    ctx.beginPath();
    ctx.moveTo(s.x0 + (nx * s.w0) / 2, s.y0 + (ny * s.w0) / 2);
    ctx.lineTo(s.x1 + (nx * s.w1) / 2, s.y1 + (ny * s.w1) / 2);
    ctx.moveTo(s.x0 - (nx * s.w0) / 2, s.y0 - (ny * s.w0) / 2);
    ctx.lineTo(s.x1 - (nx * s.w1) / 2, s.y1 - (ny * s.w1) / 2);
    ctx.stroke();
    if (s.w0 > 6) {
      ctx.strokeStyle = 'rgba(255,253,240,.7)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(s.x0 - nx * sg * s.w0 * 0.28, s.y0 - ny * sg * s.w0 * 0.28);
      ctx.lineTo(s.x1 - nx * sg * s.w1 * 0.28, s.y1 - ny * sg * s.w1 * 0.28);
      ctx.stroke();
    }
  }
  function leafShape(L) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(L * 0.5, -L * 0.33, L, 0);
    ctx.quadraticCurveTo(L * 0.5, L * 0.33, 0, 0);
  }
  function drawLeaf(t, s, p, time, on) {
    const c = leafCol(t.v);
    const droop = Math.max(0, t.v - 0.55) * 1.1;
    const sway = reduce ? 0 : Math.sin(time * 0.0021 + t.ph) * 0.12 * swayK;
    let a = s.A + t.off + sway;
    a += droop * (Math.cos(a) > 0 ? 1 : -1) * 0.6;
    const L = t.sz * (t.done ? 0.8 : 1) * (p.pz > 0.5 ? 0.45 : 1);
    ctx.save();
    ctx.translate(s.x1, s.y1);
    [
      [-0.55, 0.55],
      [0.6, 0.5],
    ].forEach(([da, f]) => {
      ctx.save();
      ctx.rotate(a + da);
      leafShape(L * f);
      ctx.fillStyle = rgb(mix(c, [110, 190, 180], 0.18), 0.5 * (1 - p.pz * 0.7));
      ctx.fill();
      ctx.strokeStyle = rgb(mix(c, [24, 58, 44], 0.5), 0.75);
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.restore();
    });
    ctx.rotate(a);
    leafShape(L);
    const fc = p.pz > 0.5 ? [150, 140, 120] : c;
    ctx.fillStyle = rgb(mix(fc, [110, 190, 180], 0.15), 0.78);
    ctx.fill();
    ctx.strokeStyle = rgb(mix(fc, [24, 58, 44], 0.55), 0.95);
    ctx.lineWidth = on ? 1.8 : 0.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.lineTo(L * 0.88, 0);
    ctx.lineWidth = 0.55;
    ctx.stroke();
    if (on) {
      ctx.strokeStyle = 'rgba(211,74,53,.9)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(L * 0.5, 0, L * 0.62, L * 0.32, 0, 0, 6.283);
      ctx.stroke();
    }
    ctx.restore();
    t.lx = s.x1 + Math.cos(a) * L * 0.55;
    t.ly = s.y1 + Math.sin(a) * L * 0.55;
    t.L = L;
  }

  function layer(inc, time) {
    for (const s of segs) {
      if (!inc(s.p)) continue;
      branch(s, hover === s.p.id || (selBranch === s.p.id && !zoomed));
    }
    // carved project names
    P.forEach((p) => {
      if (!inc(p) || p.g < 0.9 || !p.chain.length) return;
      ctx.globalAlpha = Math.min(1, (p.g - 0.9) * 10);
      const pts = [];
      p.chain.forEach((j, n) => {
        const s = segs[j];
        if (!n) pts.push([s.x0, s.y0, s.w0]);
        pts.push([s.x1, s.y1, s.w1]);
      });
      const fs = Math.max(14, Math.min(23, segs[p.segStart].w0 * 0.82));
      const gl = zoomed === p.id ? (0.55 + 0.25 * Math.sin(time * 0.003)) * focusA : 0;
      carveAlong(pts, p.name, fs, segs[p.segStart].w0 * 0.2 + trunkAt(p.t).w * 0.5, gl);
    });
    ctx.globalAlpha = 1;
    // buds on branches touched in the last two days
    P.forEach((p) => {
      if (!inc(p) || p.bud < 0.02 || p.g < 0.98) return;
      p.tasks.forEach((t) => anchorTask(t));
    const used = new Set(p.tasks.map((t) => t.s));
      for (let i = p.segStart; i < p.segEnd; i++) {
        if (tips.indexOf(i) < 0 || used.has(i)) continue;
        const s = segs[i];
        const r = 3.6 * p.bud * (reduce ? 1 : 0.85 + 0.15 * Math.sin(time * 0.004 + s.ph));
        ctx.beginPath();
        ctx.ellipse(s.x1 + Math.cos(s.A) * 4, s.y1 + Math.sin(s.A) * 4, r, r * 0.6, s.A, 0, 6.283);
        ctx.fillStyle = 'rgba(150,214,96,.85)';
        ctx.fill();
        ctx.strokeStyle = '#3c6a2a';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    });
    // leaves = tasks
    P.forEach((p) => {
      if (!inc(p) || p.g < 0.98) return;
      p.tasks.forEach((t) => {
        const s = segs[t.s];
        if (s) drawLeaf(t, s, p, time, selLeaf === t.id || hoverLeaf === t.id);
      });
    });
    // fruits = final products
    P.forEach((p) => {
      if (!inc(p) || p.g < 0.98) return;
      p.fruits.forEach((fr, j) => {
        const s = segs[p.fruitTips[j]];
        if (!s) return;
        const o = p.fruitOff[j];
        const x = s.x1 + o.dx;
        const y = s.y1 + o.dy;
        const r = (fr.done ? 8.5 : 6.5) * (selFruit === fr.id ? 1.25 : 1);
        ctx.strokeStyle = 'rgba(70,60,30,.8)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(x, y - r);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 6.283);
        ctx.fillStyle = fr.done ? 'rgba(211,74,53,.75)' : 'rgba(150,190,80,.65)';
        ctx.fill();
        ctx.strokeStyle = fr.done ? '#6a2a1e' : '#3f5a22';
        ctx.stroke();
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = 'rgba(60,20,10,.35)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let hh = -r; hh < r; hh += 2.2) {
          ctx.moveTo(x + hh, y + r);
          ctx.lineTo(x + hh + r, y);
        }
        ctx.stroke();
        ctx.restore();
        p.fx[j] = [x, y, r];
        if (zoomed === p.id && p.fs[j])
          label(fr.n, p.fs[j][0] + (x < CX ? -16 : 16), p.fs[j][1], 13, { q: 1, bold: 1, align: x < CX ? 'right' : 'left', col: fr.done ? '#8a2a1a' : '#3f5a22' });
      });
    });
  }

  function drawGround() {
    // sun = purpose
    const sx = CX;
    const sy = 46;
    const sr = 32;
    ctx.strokeStyle = '#e0b83a';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * 6.283;
      const r2 = sr + (i % 2 ? 20 : 32);
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * (sr + 4), sy + Math.sin(a) * (sr + 4));
      ctx.lineTo(sx + Math.cos(a + 0.06) * r2, sy + Math.sin(a + 0.06) * r2);
      ctx.stroke();
    }
    ctx.fillStyle = hoverSun ? 'rgba(250,206,70,.55)' : 'rgba(246,214,92,.35)';
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, 6.283);
    ctx.fill();
    ctx.strokeStyle = '#8a7a3a';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const purpose = model.purpose || 'Tu propósito';
    let pfs = 19;
    ctx.font = hand(pfs, 1);
    const pw = ctx.measureText(purpose).width;
    if (pw > 150) pfs = Math.max(12, (pfs * 150) / pw);
    ctx.font = hand(pfs, 1);
    ctx.fillStyle = model.purpose ? '#4a4220' : '#8a7f5a';
    ctx.fillText(purpose, sx, sy - 5);
    ctx.font = hand(14);
    ctx.fillStyle = '#6a6040';
    ctx.fillText('Propósito', sx, sy + 13);
    // ground line
    ctx.strokeStyle = 'rgba(176,98,80,.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-400, GY + 6);
    for (let x = -400; x <= DW + 400; x += 40) ctx.lineTo(x, GY + 6 + Math.sin(x * 0.05) * 1.5);
    ctx.stroke();
    // roots = passions, names written along them
    const n = model.roots.length;
    rootPts = [];
    model.roots.forEach((r, i) => {
      const u0 = n === 1 ? 0.5 : i / (n - 1);
      const ex = 100 + 800 * u0;
      const ey = 790 + 32 * Math.sin(Math.PI * u0);
      const bx = CX + (u0 - 0.5) * 56;
      const by = GY + 6;
      const c1x = bx + (ex - bx) * 0.15;
      const c1y = GY + 80;
      const c2x = bx + (ex - bx) * 0.7;
      const c2y = ey - 36;
      const pts = [];
      for (let j = 0; j <= 30; j++) {
        const u = j / 30;
        const iu = 1 - u;
        pts.push([
          iu * iu * iu * bx + 3 * iu * iu * u * c1x + 3 * iu * u * u * c2x + u * u * u * ex,
          iu * iu * iu * by + 3 * iu * iu * u * c1y + 3 * iu * u * u * c2y + u * u * u * ey,
        ]);
      }
      rootPts.push(pts);
      ctx.lineCap = 'round';
      if (hoverRoot === i || selRoot === i) {
        ctx.save();
        ctx.shadowColor = selRoot === i ? 'rgba(255,200,90,.95)' : 'rgba(255,230,170,.9)';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = selRoot === i ? 'rgba(255,214,110,.55)' : 'rgba(255,240,200,.5)';
        ctx.beginPath();
        pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.lineWidth = 18;
        ctx.stroke();
        ctx.restore();
      }
      for (let j = 1; j < pts.length; j++) {
        const u = j / 30;
        ctx.strokeStyle = 'rgba(196,70,58,.85)';
        ctx.lineWidth = 12 * (1 - u) + 2;
        ctx.beginPath();
        ctx.moveTo(pts[j - 1][0], pts[j - 1][1]);
        ctx.lineTo(pts[j][0], pts[j][1]);
        ctx.stroke();
      }
      for (let j = 1; j < pts.length; j++) {
        const u = j / 30;
        ctx.strokeStyle = 'rgba(255,236,226,.55)';
        ctx.lineWidth = Math.max(0.6, 2.4 * (1 - u));
        ctx.beginPath();
        ctx.moveTo(pts[j - 1][0], pts[j - 1][1] - 12 * (1 - u) * 0.25);
        ctx.lineTo(pts[j][0], pts[j][1] - 12 * (1 - u) * 0.25);
        ctx.stroke();
      }
      if (Math.abs(ex - bx) < 120) carveChar(r, ex + 4, ey - 16, 0, 15);
      else carveAlong(pts.slice(13, 30).map(([x, y]) => [x, y - 11]), r, 15, 2);
    });
    ctx.lineCap = 'butt';
    if (n) {
      ctx.font = hand(17, 1);
      ctx.fillStyle = '#5a4a1a';
      ctx.textAlign = 'center';
      ctx.fillText('Pasiones', CX - 120, GY + 28);
    }
    // trunk = experience
    const Lp = [];
    const Rp = [];
    for (let j = 0; j <= 24; j++) {
      const tp = trunkAt(j / 24);
      const fl = j < 4 ? (4 - j) * 7 : 0;
      Lp.push([tp.x - tp.w / 2 - fl, tp.y]);
      Rp.push([tp.x + tp.w / 2 + fl, tp.y]);
    }
    ctx.beginPath();
    Lp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    Rp.slice()
      .reverse()
      .forEach((p) => ctx.lineTo(p[0], p[1]));
    ctx.closePath();
    const tg = ctx.createLinearGradient(0, GY, 0, GY - TH);
    [0, 0.25, 0.5, 0.75, 1].forEach((u) => tg.addColorStop(u, rgb(trunkCol(u))));
    ctx.fillStyle = tg;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // round shading: light on the left, shadow on the right, so the bark reads as a cylinder
    const sh = ctx.createLinearGradient(CX - 46, 0, CX + 46, 0);
    sh.addColorStop(0, 'rgba(60,60,50,.18)');
    sh.addColorStop(0.3, 'rgba(255,255,248,.22)');
    sh.addColorStop(0.62, 'rgba(255,255,248,0)');
    sh.addColorStop(1, 'rgba(40,42,34,.26)');
    ctx.fillStyle = sh;
    ctx.fillRect(CX - 80, GY - TH - 10, 160, TH + 40);
    // the experience band under the pointer (or selected) lights up a little
    const nb = model.trunk.length;
    [hoverTrunk, selTrunk].forEach((bi, k2) => {
      if (bi === null || bi < 0 || bi >= nb) return;
      const t0 = bi === 0 ? 0 : BAND0 + (bi - 0.5) * BAND;
      const t1 = BAND0 + (bi + 0.5) * BAND;
      ctx.fillStyle = k2 ? 'rgba(255,214,110,.22)' : 'rgba(255,250,225,.2)';
      ctx.fillRect(CX - 80, GY - t1 * TH, 160, (t1 - t0) * TH);
    });
    ctx.strokeStyle = 'rgba(70,72,62,.32)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let j = 0; j < 120; j++) {
      const tp = trunkAt(j / 120);
      const x0 = tp.x - tp.w / 2;
      ctx.moveTo(x0, tp.y);
      ctx.lineTo(x0 + tp.w * 0.24, tp.y - 3);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(70,72,62,.2)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      for (let j = 0; j <= 16; j++) {
        const tp = trunkAt(j / 16);
        const x = tp.x + ((i - 2) / 5) * tp.w + Math.sin(j * 1.3 + i) * 1.6;
        if (j) ctx.lineTo(x, tp.y);
        else ctx.moveTo(x, tp.y);
      }
      ctx.stroke();
    }
    // suggested divisions between experiences: faint rings that wrap the trunk
    for (let i = 0; i < nb; i++) {
      const tp = trunkAt(BAND0 + (i + 0.5) * BAND);
      const rx = tp.w / 2 + 1;
      ctx.beginPath();
      ctx.ellipse(tp.x, tp.y, rx, 3.2, 0, 0.08, Math.PI - 0.08);
      ctx.strokeStyle = 'rgba(58,60,50,.38)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(tp.x, tp.y + 1.4, rx, 3.2, 0, 0.15, Math.PI - 0.15);
      ctx.strokeStyle = 'rgba(255,255,244,.32)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(70,74,58,.85)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    Lp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    ctx.beginPath();
    Rp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    // experience carved into the round trunk (vertical cylinder: letters squeeze towards the edges)
    model.trunk.forEach(([a, b], i) => {
      const tp = trunkAt(BAND0 + i * BAND);
      const R = tp.w / 2;
      let fs = 16;
      ctx.font = hand(fs, 1);
      const mw = Math.max(ctx.measureText(a).width, ctx.measureText(b || '').width);
      if (mw > tp.w * 0.88) fs *= (tp.w * 0.88) / mw;
      if (b) {
        carveChar(a, tp.x, tp.y - fs * 0.5, 0, fs, R, true);
        carveChar(b, tp.x, tp.y + fs * 0.5, 0, fs, R, true);
      } else carveChar(a, tp.x, tp.y, 0, fs, R, true);
    });
  }

  function scene(time, part) {
    if (part !== 'fg') {
      drawGround();
      const fz = zoomed && focusA > 0.02;
      if (fz) {
        layer((p) => p.id !== zoomed, time);
        ctx.fillStyle = `rgba(244,241,232,${0.72 * focusA})`;
        ctx.fillRect(-3000, -3000, 7000, 7000);
      } else layer(() => true, time);
      if (part === 'bg') {
        LQ = [];
        return;
      }
    }
    if (zoomed && focusA > 0.02) layer((p) => p.id === zoomed, time);
    for (const f of fall) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.a);
      ctx.globalAlpha = Math.max(0, f.life);
      leafShape(11);
      ctx.fillStyle = 'rgba(165,112,55,.7)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,60,30,.8)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // task names when zoomed
    if (zoomed && cam.z > goal.z * 0.9) {
      const p = P.find((q) => q.id === zoomed);
      if (p)
        p.tasks.forEach((t) => {
          if (t.sx === undefined) return;
          label(t.n, t.sx, t.sy, 13, { q: 2, align: t.right ? 'left' : 'right', col: t.done ? '#6b6f60' : '#26301c' });
        });
    }
    flushLabels();
    drawHint(time);
  }

  function drawHint(time) {
    if (!hintT || zoomed) return;
    let cx;
    let cy;
    let rx;
    let ry;
    if (hintT === 'sun') [cx, cy, rx, ry] = [CX, 46, 70, 62];
    else if (hintT === 'roots') {
      if (!rootPts.length) return;
      [cx, cy, rx, ry] = [CX, GY + 62, 430, 70];
    } else if (hintT === 'trunk') {
      const top = trunkAt(BAND0 + Math.max(1, model.trunk.length) * BAND);
      [cx, cy, rx, ry] = [CX, (GY + top.y) / 2, 70, (GY - top.y) / 2 + 22];
    } else if (hintT === 'branch') {
      const p = P[0];
      if (!p || !p.bbox) return;
      const [a, b, c, d] = p.bbox;
      [cx, cy, rx, ry] = [(a + c) / 2, (b + d) / 2, (c - a) / 2 + 24, (d - b) / 2 + 24];
    } else return;
    const pulse = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(time / 380);
    ctx.save();
    ctx.setLineDash([7, 7]);
    ctx.lineDashOffset = reduce ? 0 : -time / 60;
    ctx.strokeStyle = `rgba(214,150,30,${0.55 + 0.35 * pulse})`;
    ctx.lineWidth = 2.2 + pulse;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx + pulse * 4, ry + pulse * 4, 0, 0, 6.283);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- camera & loop
  function zoomTo(id, instant) {
    const p = id ? P.find((q) => q.id === id) : null;
    const changed = zoomed !== (p ? id : null);
    zoomed = p ? id : null;
    settled = false;
    if (!p) Object.assign(goal, { fx: DW / 2, fy: DH / 2, z: 1 });
    else {
      let [a, b, c, d] = p.bbox;
      a -= 60;
      c += 60;
      b -= 40;
      d += 40;
      const visW = Math.max(W * 0.45, W - rightInset);
      const z = Math.max(1.4, Math.min(3.4, Math.min(visW / ((c - a) * k), H / ((d - b) * k)) * 0.92));
      Object.assign(goal, { fx: (a + c) / 2 + (W - visW) / 2 / (k * z), fy: (b + d) / 2, z });
    }
    if (instant || reduce) Object.assign(cam, goal);
    if (changed && opts.onZoom) opts.onZoom(zoomed);
  }

  function frame(time) {
    if (!alive) return;
    const dt = Math.min(60, time - last || 16);
    last = time;
    const e = reduce ? 1 : 0.1;
    cam.fx += (goal.fx - cam.fx) * e;
    cam.fy += (goal.fy - cam.fy) * e;
    cam.z += (goal.z - cam.z) * e;
    const was = settled;
    settled = Math.abs(goal.z - cam.z) < 0.004 && Math.abs(goal.fx - cam.fx) < 0.5 && Math.abs(goal.fy - cam.fy) < 0.5;
    if (settled && !was) LC = {};
    focusA += ((zoomed ? 1 : 0) - focusA) * 0.08;
    swayK = 1 - 0.94 * focusA;
    P.forEach((p) => {
      if (p.g < 1) p.g = Math.min(1, p.g + dt * 0.00045);
      p.pz += ((p.paused ? 1 : 0) - p.pz) * 0.05;
      p.bud += ((pDays(p) < 2 && !p.paused ? 1 : 0) - p.bud) * 0.05;
      p.tasks.forEach((t) => {
        t.v += (tv(t.d, t.done) - t.v) * 0.05;
        if (!reduce && !p.paused && t.v > 0.85 && fall.length < 4 && !(zoomed && p.id !== zoomed) && Math.random() < 0.0012 && t.lx !== undefined)
          fall.push({ x: t.lx, y: t.ly, a: Math.random() * 6, vx: Math.random() * 0.6 - 0.3, life: 1 });
      });
    });
    fall.forEach((f) => {
      f.y += 0.04 * dt;
      f.x += f.vx + Math.sin(f.y * 0.03) * 0.4;
      f.a += 0.02;
      if (f.y > GY) f.life -= 0.02;
    });
    fall = fall.filter((f) => f.life > 0);
    layout(time);
    K = k * cam.z;
    const view = () => ctx.setTransform(dpr * K, 0, 0, dpr * K, dpr * (W / 2 - cam.fx * K), dpr * (H / 2 - cam.fy * K));
    const paint = (part) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#f4f1e8';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = ctx.createPattern(noise, 'repeat');
      ctx.fillRect(0, 0, W, H);
      view();
      scene(time, part);
    };
    // once a zoom has settled, the dimmed rest of the tree is painted once and reused every frame
    if (zoomed && settled && focusA > 0.98) {
      const key = [zoomed, W, H, dpr, cam.fx.toFixed(1), cam.fy.toFixed(1), cam.z.toFixed(3)].join('|');
      if (bgKey !== key) {
        if (!bgC) bgC = document.createElement('canvas');
        bgC.width = cv.width;
        bgC.height = cv.height;
        ctx = bgC.getContext('2d');
        paint('bg');
        ctx = mainCtx;
        bgKey = key;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(bgC, 0, 0);
      view();
      scene(time, 'fg');
    } else {
      bgKey = '';
      paint('all');
    }
    raf = requestAnimationFrame(frame);
  }

  // ---------- picking & input
  const toD = (mx, my) => [(mx - W / 2) / K + cam.fx, (my - H / 2) / K + cam.fy];
  function pickFruit(x, y) {
    let best = null;
    P.forEach((p) =>
      (p.fx || []).forEach((f, j) => {
        if (f && p.g >= 0.98 && Math.hypot(x - f[0], y - f[1]) < f[2] + 5 / K) best = [p, p.fruits[j]];
      })
    );
    return best;
  }
  function pickLeaf(x, y) {
    let best = null;
    let bd = 14 / K;
    P.forEach((p) =>
      p.tasks.forEach((t) => {
        if (t.lx === undefined) return;
        const d = Math.hypot(x - t.lx, y - t.ly) - t.L * 0.35;
        if (d < bd) {
          bd = d;
          best = [p, t];
        }
      })
    );
    return best;
  }
  function pickBranch(x, y) {
    let best = null;
    let bd = 10 / K;
    for (const s of segs) {
      const dx = s.x1 - s.x0;
      const dy = s.y1 - s.y0;
      const u = Math.max(0, Math.min(1, ((x - s.x0) * dx + (y - s.y0) * dy) / (dx * dx + dy * dy || 1)));
      const d = Math.hypot(x - s.x0 - u * dx, y - s.y0 - u * dy) - s.w0 / 2;
      if (d < bd) {
        bd = d;
        best = s.p;
      }
    }
    return best;
  }
  function pickSun(x, y) {
    return Math.hypot(x - CX, y - 46) < 48;
  }
  function pickRoot(x, y) {
    if (y < GY) return null;
    let best = null;
    let bd = 13;
    rootPts.forEach((pts, i) => {
      for (let j = 1; j < pts.length; j += 1) {
        const [ax, ay] = pts[j - 1];
        const [bx, by] = pts[j];
        const dx = bx - ax;
        const dy = by - ay;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
        const dd = Math.hypot(x - ax - dx * t, y - ay - dy * t) - 5 * (1 - j / 30);
        if (dd < bd) {
          bd = dd;
          best = i;
        }
      }
    });
    return best;
  }
  function pickTrunk(x, y) {
    const n = model.trunk.length;
    if (!n) return null;
    const t = (GY - y) / TH;
    const top = BAND0 + (n - 0.5) * BAND;
    if (t < 0 || t > top) return null;
    const tp = trunkAt(t);
    if (Math.abs(x - tp.x) > tp.w / 2 + 2) return null;
    return Math.max(0, Math.min(n - 1, Math.round((t - BAND0) / BAND)));
  }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ago = (d) => (d < 1 ? 'hoy' : d < 2 ? 'ayer' : `hace ${Math.round(d)} días`);

  function onMove(e) {
    const r = cv.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const [x, y] = toD(mx, my);
    const fu = pickFruit(x, y);
    const lf = fu ? null : pickLeaf(x, y);
    const br = fu ? fu[0] : lf ? lf[0] : pickBranch(x, y);
    const tk = fu || lf || br ? null : pickTrunk(x, y);
    const rt = fu || lf || br || tk !== null || zoomed ? null : pickRoot(x, y);
    const sn = !(fu || lf || br || tk !== null || rt !== null || zoomed) && pickSun(x, y);
    hoverLeaf = lf ? lf[1].id : null;
    hover = br ? br.id : null;
    if (tk !== hoverTrunk || rt !== hoverRoot || sn !== hoverSun) {
      hoverTrunk = tk;
      hoverRoot = rt;
      hoverSun = sn;
      bgKey = '';
    }
    const any = fu || lf || br || tk !== null || rt !== null || sn;
    cv.style.cursor = any ? 'pointer' : 'default';
    if (!tipEl) return;
    if (fu) tipEl.innerHTML = `<b>${esc(fu[1].n)}</b>Fruto · ${fu[1].done ? 'cosechado' : 'madurando'} · clic para abrirlo`;
    else if (lf) tipEl.innerHTML = `<b>${esc(lf[1].n)}</b>${esc(lf[0].name)} · ${leafStateLabel(lf[1])}${lf[1].done ? '' : ' · ' + ago(lf[1].d)}`;
    else if (br) tipEl.innerHTML = `<b>${esc(br.name)}</b>${br.paused ? 'En pausa' : 'Rama'} · ${br.tasks.filter((t) => !t.done).length} tareas abiertas`;
    else if (tk !== null) tipEl.innerHTML = `<b>${esc(model.trunk[tk].filter(Boolean).join(' '))}</b>Experiencia · clic para verla y añadir contexto`;
    else if (rt !== null) tipEl.innerHTML = `<b>${esc(model.roots[rt])}</b>Pasión · clic para verla y cambiarla`;
    else if (sn) tipEl.innerHTML = `<b>${esc(model.purpose || 'Tu propósito')}</b>El sol es tu propósito · clic para ${model.purpose ? 'cambiarlo' : 'escribirlo'}`;
    tipEl.hidden = !any;
    tipEl.style.left = mx + 'px';
    tipEl.style.top = my + 'px';
  }
  function onLeave() {
    hover = null;
    hoverLeaf = null;
    hoverTrunk = null;
    hoverRoot = null;
    hoverSun = false;
    bgKey = '';
    if (tipEl) tipEl.hidden = true;
  }
  function onClick(e) {
    const r = cv.getBoundingClientRect();
    const [x, y] = toD(e.clientX - r.left, e.clientY - r.top);
    const fu = pickFruit(x, y);
    if (fu) {
      if (zoomed !== fu[0].id) zoomTo(fu[0].id);
      if (opts.onFruit) opts.onFruit(fu[0].id, fu[1].id);
      return;
    }
    const lf = pickLeaf(x, y);
    if (lf) {
      if (zoomed !== lf[0].id) zoomTo(lf[0].id);
      if (opts.onLeaf) opts.onLeaf(lf[0].id, lf[1].id);
      return;
    }
    const br = pickBranch(x, y);
    if (br) {
      zoomTo(br.id);
      if (opts.onBranch) opts.onBranch(br.id);
      return;
    }
    const tk = pickTrunk(x, y);
    if (tk !== null) {
      if (zoomed) zoomTo(null);
      if (opts.onTrunk) opts.onTrunk(tk);
      return;
    }
    if (!zoomed) {
      const rt = pickRoot(x, y);
      if (rt !== null) {
        if (opts.onRoot) opts.onRoot(rt);
        return;
      }
      if (pickSun(x, y)) {
        if (opts.onSun) opts.onSun();
        return;
      }
    }
    if (zoomed) {
      zoomTo(null);
      if (opts.onBackground) opts.onBackground();
    }
  }

  cv.addEventListener('mousemove', onMove);
  cv.addEventListener('mouseleave', onLeave);
  cv.addEventListener('click', onClick);
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(fig);
  resize();
  raf = requestAnimationFrame(frame);

  return {
    setModel,
    zoomTo: (id) => zoomTo(id),
    setRightInset(px) {
      const next = Math.max(0, px || 0);
      if (next === rightInset) return;
      rightInset = next;
      if (zoomed) zoomTo(zoomed);
    },
    setHint(target) {
      hintT = target || null;
    },
    select({ branchId = null, leafId = null, fruitId = null, trunkIndex = null, rootIndex = null } = {}) {
      selRoot = rootIndex;
      selBranch = branchId;
      selLeaf = leafId;
      selFruit = fruitId;
      selTrunk = trunkIndex;
      bgKey = '';
    },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      cv.removeEventListener('mousemove', onMove);
      cv.removeEventListener('mouseleave', onLeave);
      cv.removeEventListener('click', onClick);
      if (ro) ro.disconnect();
      if (document.fonts && document.fonts.removeEventListener) document.fonts.removeEventListener('loadingdone', clearFontCaches);
    },
  };
}
