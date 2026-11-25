/* Logic Puzzles engine v0
 * Model: n entities (groups). Category 0 is the anchor (ordered, e.g. price/position);
 * anchor item i belongs to group i. Every other item x has an unknown group g(x).
 * Item id = cat * n + idx.
 *
 * Two solvers:
 *  - solve(): human-style, tiered techniques, records proof steps (difficulty + hints).
 *  - countSolutions(): exhaustive, used only to verify uniqueness in tests.
 */
// Named so the page can hand this exact code to a background worker (works even from file://)
function LPEngineFactory(root) {
  'use strict';

  // ---------- utils ----------
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, r) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
  function popcount(m) { let c = 0; while (m) { m &= m - 1; c++; } return c; }
  function bitIndex(m) { return 31 - Math.clz32(m); } // for single-bit masks

  // ---------- clue semantics ----------
  // gs = groups of the clue's refs, vals = anchor values per group
  function clueHolds(cl, gs, vals) {
    switch (cl.type) {
      case 'any': return true; // no constraint (used to test whether a clue still adds anything)
      case 'same': return gs[0] === gs[1];
      case 'diff': return gs[0] !== gs[1];
      case 'either': return (gs[0] === gs[1]) !== (gs[0] === gs[2]);
      case 'pair':
        return gs[0] !== gs[1] &&
          ((gs[0] === gs[2] && gs[1] === gs[3]) || (gs[0] === gs[3] && gs[1] === gs[2]));
      case 'alldiff': {
        let m = 0;
        for (const g of gs) { if (m & (1 << g)) return false; m |= 1 << g; }
        return true;
      }
      case 'less': return vals[gs[0]] < vals[gs[1]];
      case 'by': return vals[gs[1]] - vals[gs[0]] === cl.d;
      // set clues: refs = [x, ...members of a tag set]
      case 'oneOf': for (let i = 1; i < gs.length; i++) if (gs[i] === gs[0]) return true; return false;
      case 'noneOf': for (let i = 1; i < gs.length; i++) if (gs[i] === gs[0]) return false; return true;
      // second numeric category: refs = [a, b, ...all items of that category], cl.sv = their values.
      // a's value is the value of whichever of those items shares a's group.
      case 'nless': case 'nby': {
        let va = NaN, vb = NaN;
        for (let i = 2; i < gs.length; i++) { if (gs[i] === gs[0]) va = cl.sv[i - 2]; if (gs[i] === gs[1]) vb = cl.sv[i - 2]; }
        return cl.type === 'nless' ? va < vb : vb - va === cl.d;
      }
      case 'setOrder': // dir 1: x is above every member, dir -1: below every member
        for (let i = 1; i < gs.length; i++) if ((vals[gs[0]] - vals[gs[i]]) * cl.dir <= 0) return false;
        return true;
    }
    throw new Error('unknown clue type ' + cl.type);
  }

  // ---------- state ----------
  class State {
    constructor(P) {
      this.P = P; this.n = P.n; this.k = P.k; this.N = P.n * P.k;
      this.full = (1 << P.n) - 1;
      this.D = new Int32Array(this.N);
      this.R = new Int8Array(this.N * this.N); // non-anchor pairs only: 1 yes, -1 no, 0 unknown
      for (let x = 0; x < this.N; x++) this.D[x] = x < this.n ? (1 << x) : this.full;
      this.bad = false;
    }
    clone() {
      const s = Object.create(State.prototype);
      Object.assign(s, this);
      s.D = this.D.slice(); s.R = this.R.slice();
      return s;
    }
    cat(x) { return Math.floor(x / this.n); }
    // relation between any two items: 1 / -1 / 0
    rel(x, y) {
      if (x === y) return 1;
      const cx = this.cat(x), cy = this.cat(y);
      if (cx === cy) return -1;
      if (cx === 0 || cy === 0) {
        const a = cx === 0 ? x : y, b = cx === 0 ? y : x;
        const bit = 1 << a;
        if (!(this.D[b] & bit)) return -1;
        return this.D[b] === bit ? 1 : 0;
      }
      return this.R[x * this.N + y];
    }
    // apply a mark [x, y, v]; returns true if it changed anything
    mark(x, y, v) {
      if (this.bad) return false;
      const cx = this.cat(x), cy = this.cat(y);
      if (cx === cy) { if (v === 1 && x !== y) this.bad = true; return false; }
      if (cx === 0 || cy === 0) {
        const a = cx === 0 ? x : y, b = cx === 0 ? y : x;
        const bit = 1 << a, before = this.D[b];
        const after = v === 1 ? before & bit : before & ~bit;
        if (after === before) return false;
        this.D[b] = after;
        if (!after) this.bad = true;
        return true;
      }
      const cur = this.R[x * this.N + y];
      if (cur === v) return false;
      if (cur !== 0) { this.bad = true; return false; }
      this.R[x * this.N + y] = v; this.R[y * this.N + x] = v;
      return true;
    }
    solved() {
      for (let x = this.n; x < this.N; x++) if (popcount(this.D[x]) !== 1) return false;
      return true;
    }
    groups() { // only valid when solved
      const g = []; for (let x = 0; x < this.N; x++) g.push(bitIndex(this.D[x])); return g;
    }
  }

  // ---------- generic clue reasoning (enumerate local worlds) ----------
  // Returns {count, marks} — marks are deductions valid in every local world.
  function enumerate(S, clues, nodeCap) {
    const n = S.n, vals = S.P.values;
    const refSet = [];
    for (const c of clues) for (const r of c.refs) if (!refSet.includes(r)) refSet.push(r);
    // order: most constrained first
    refSet.sort((a, b) => popcount(S.D[a]) - popcount(S.D[b]));
    const m = refSet.length;
    const pos = new Map(refSet.map((r, i) => [r, i]));
    const checkAt = Array.from({ length: m }, () => []);
    for (const c of clues) {
      const idx = c.refs.map(r => pos.get(r));
      checkAt[Math.max(...idx)].push([c, idx]);
    }
    const relM = new Int8Array(m * m);
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) if (i !== j) relM[i * m + j] = S.rel(refSet[i], refSet[j]);
    const gs = new Array(m), support = new Int32Array(m), seen = new Uint8Array(m * m);
    let count = 0, nodes = 0, capped = false;
    const tmp = [];
    (function rec(i) {
      if (capped) return;
      if (++nodes > nodeCap) { capped = true; return; }
      if (i === m) {
        count++;
        for (let p = 0; p < m; p++) {
          support[p] |= 1 << gs[p];
          for (let q = p + 1; q < m; q++) seen[p * m + q] |= gs[p] === gs[q] ? 1 : 2;
        }
        return;
      }
      let dom = S.D[refSet[i]];
      while (dom) {
        const bit = dom & -dom; dom ^= bit;
        const e = bitIndex(bit);
        let ok = true;
        for (let j = 0; j < i && ok; j++) {
          const r = relM[i * m + j];
          if (r === 1 && gs[j] !== e) ok = false;
          else if (r === -1 && gs[j] === e) ok = false;
        }
        if (!ok) continue;
        gs[i] = e;
        for (const [c, idx] of checkAt[i]) {
          tmp.length = 0; for (const k of idx) tmp.push(gs[k]);
          if (!clueHolds(c, tmp, vals)) { ok = false; break; }
        }
        if (ok) rec(i + 1);
      }
    })(0);
    if (capped) return { count: -1, marks: [] };
    const marks = [];
    if (count === 0) return { count, marks };
    for (let p = 0; p < m; p++) {
      const x = refSet[p];
      if (x < n) continue;
      let gone = S.D[x] & ~support[p];
      while (gone) { const bit = gone & -gone; gone ^= bit; marks.push([bitIndex(bit), x, -1]); }
    }
    for (let p = 0; p < m; p++) for (let q = p + 1; q < m; q++) {
      const x = refSet[p], y = refSet[q];
      if (x < n || y < n || S.cat(x) === S.cat(y)) continue;
      const s = seen[p * m + q], cur = S.rel(x, y);
      if (s === 1 && cur !== 1) marks.push([x, y, 1]);
      if (s === 2 && cur !== -1) marks.push([x, y, -1]);
    }
    return { count, marks };
  }

  function applyMarks(S, marks) {
    const applied = [];
    for (const mk of marks) if (S.mark(mk[0], mk[1], mk[2])) applied.push(mk);
    return applied;
  }

  // ---------- techniques ----------
  // Each returns a step {tier, rule, clues, marks} after applying it, or null.
  function tier1(S, ctx) {
    const { n, N } = S, k = S.k;
    // 1. direct reading of a clue
    for (const c of ctx.clues) {
      const fresh = ctx.direct(c).filter(mk => S.rel(mk[0], mk[1]) !== mk[2]);
      if (fresh.length) return { tier: 1, rule: 'direct', clues: [c.id], marks: applyMarks(S, fresh) };
    }
    // 2. confirmed in anchor grid -> cross out the rest of that column
    for (let x = n; x < N; x++) {
      const d = S.D[x]; if (popcount(d) !== 1) continue;
      const c = S.cat(x), marks = [];
      for (let y = c * n; y < (c + 1) * n; y++) if (y !== x && (S.D[y] & d)) marks.push([bitIndex(d), y, -1]);
      if (marks.length) return { tier: 1, rule: 'sweep', clues: [], marks: applyMarks(S, marks), focus: [bitIndex(d), x] };
    }
    // 3. only one place left in an anchor-grid row/column
    for (let c = 1; c < k; c++) for (let e = 0; e < n; e++) {
      let cand = -1, cnt = 0;
      for (let y = c * n; y < (c + 1) * n; y++) if (S.D[y] & (1 << e)) { cnt++; cand = y; }
      if (cnt === 1 && S.D[cand] !== (1 << e))
        return { tier: 1, rule: 'last', clues: [], marks: applyMarks(S, [[e, cand, 1]]) };
    }
    // 4. non-anchor grids
    for (let x = n; x < N; x++) for (let y = n; y < N; y++) {
      if (x === y || S.cat(x) === S.cat(y)) continue;
      const r = S.rel(x, y);
      if (r === 1) {
        // sweep the rest of the row in this grid
        const cy = S.cat(y), sweep = [];
        for (let z = cy * n; z < (cy + 1) * n; z++) if (z !== y && S.rel(x, z) !== -1) sweep.push([x, z, -1]);
        if (sweep.length) return { tier: 1, rule: 'sweep', clues: [], marks: applyMarks(S, sweep), focus: [x, y] };
        // same thing => same anchor options
        if (S.D[x] !== S.D[y]) {
          const both = S.D[x] & S.D[y], marks = [];
          for (const [a, b] of [[x, y], [y, x]]) {
            let gone = S.D[a] & ~both;
            while (gone) { const bit = gone & -gone; gone ^= bit; marks.push([bitIndex(bit), a, -1]); }
          }
          return { tier: 1, rule: 'transfer', clues: [], marks: applyMarks(S, marks), focus: [x, y] };
        }
        // transitivity
        const marks = [];
        for (let z = n; z < N; z++) {
          if (z === x || z === y || S.cat(z) === S.cat(x) || S.cat(z) === S.cat(y)) continue;
          const rx = S.rel(x, z), ry = S.rel(y, z);
          if (rx !== 0 && ry === 0) marks.push([y, z, rx]);
        }
        if (marks.length) return { tier: 1, rule: 'transfer', clues: [], marks: applyMarks(S, marks), focus: [x, y] };
      } else if (r === 0) {
        if (!(S.D[x] & S.D[y])) return { tier: 1, rule: 'compare', clues: [], marks: applyMarks(S, [[x, y, -1]]) };
        if (S.D[x] === S.D[y] && popcount(S.D[x]) === 1) return { tier: 1, rule: 'compare', clues: [], marks: applyMarks(S, [[x, y, 1]]) };
      } else if (r === -1 && popcount(S.D[x]) === 1 && (S.D[y] & S.D[x])) {
        return { tier: 1, rule: 'transfer', clues: [], marks: applyMarks(S, [[bitIndex(S.D[x]), y, -1]]), focus: [x, y] };
      }
    }
    // 5. last option in a non-anchor grid row
    for (let x = n; x < N; x++) for (let c = 1; c < k; c++) {
      if (c === S.cat(x)) continue;
      let cand = -1, cnt = 0;
      for (let y = c * n; y < (c + 1) * n; y++) if (S.rel(x, y) !== -1) { cnt++; cand = y; }
      if (cnt === 1 && S.rel(x, cand) !== 1) return { tier: 1, rule: 'last', clues: [], marks: applyMarks(S, [[x, cand, 1]]) };
    }
    return null;
  }

  function tier2(S, ctx) {
    for (const c of ctx.clues) {
      if (c.type === 'same' || c.type === 'diff') continue; // fully used at tier 1
      const res = enumerate(S, [c], 20000);
      if (res.count === 0) { S.bad = true; return { tier: 2, rule: 'clue', clues: [c.id], marks: [] }; }
      if (res.marks.length) return { tier: 2, rule: 'clue', clues: [c.id], marks: applyMarks(S, res.marks) };
    }
    return null;
  }

  function linked(S, a, b) {
    for (const x of a.refs) for (const y of b.refs) if (x === y || (x >= S.n && y >= S.n && S.rel(x, y) === 1)) return true;
    return false;
  }

  function tier3(S, ctx) {
    const cl = ctx.clues;
    for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) {
      if (!linked(S, cl[i], cl[j])) continue;
      const res = enumerate(S, [cl[i], cl[j]], 60000);
      if (res.count === 0) { S.bad = true; return { tier: 3, rule: 'combine', clues: [cl[i].id, cl[j].id], marks: [] }; }
      if (res.marks.length) return { tier: 3, rule: 'combine', clues: [cl[i].id, cl[j].id], marks: applyMarks(S, res.marks) };
    }
    return null;
  }

  // What each clue says on its own, worked out only when a solve first needs it (most pool clues never are)
  function directOf(P) {
    const cache = new WeakMap(), fresh = new State(P);
    return c => {
      let m = cache.get(c);
      if (!m) { m = enumerate(fresh, [c], 1e6).marks; cache.set(c, m); }
      return m;
    };
  }
  function makeCtx(P, clues, direct) {
    return { clues, direct: direct || directOf(P) };
  }

  // Human-style solve. maxTier caps the techniques allowed.
  function solve(P, clues, maxTier, opts) {
    opts = opts || {};
    clues = clues || P.clues;
    const S = opts.state ? opts.state.clone() : new State(P);
    const ctx = opts.ctx || makeCtx(P, clues);
    const steps = [];
    let hardest = 0;
    const limit = opts.maxSteps || 1000;
    while (!S.solved() && !S.bad && steps.length < limit) {
      const step = tier1(S, ctx) || (maxTier >= 2 && tier2(S, ctx)) || (maxTier >= 3 && tier3(S, ctx));
      if (!step) break;
      steps.push(step);
      if (step.tier > hardest) hardest = step.tier;
      if (opts.firstOnly) break;
    }
    const status = S.bad ? 'contradiction' : S.solved() ? 'solved' : 'stuck';
    return { status, hardest, steps, state: S };
  }

  // Exhaustive count (stops at limit).
  function countSolutions(P, clues, limit) {
    limit = limit || 2;
    clues = clues || P.clues;
    const { n, k } = P, N = n * k, vals = P.values;
    const g = new Int32Array(N); for (let i = 0; i < n; i++) g[i] = i;
    const checkAt = Array.from({ length: N }, () => []);
    for (const c of clues) checkAt[Math.max(n, ...c.refs)].push(c);
    let count = 0;
    const used = new Int32Array(k);
    (function rec(x) {
      if (count >= limit) return;
      if (x === N) { count++; return; }
      const c = Math.floor(x / n);
      for (let e = 0; e < n; e++) {
        if (used[c] & (1 << e)) continue;
        g[x] = e; used[c] |= 1 << e;
        let ok = true;
        for (const cl of checkAt[x]) if (!clueHolds(cl, cl.refs.map(r => g[r]), vals)) { ok = false; break; }
        if (ok) rec(x + 1);
        used[c] &= ~(1 << e);
      }
    })(n);
    return count;
  }

  // ---------- generation ----------
  const TIER = { easy: 1, medium: 2, hard: 3, fiendish: 3 }; // Fiendish = Hard techniques, from the Fiendish bank

  function buildPuzzle(theme, r, n, k) {
    const values = theme.anchor.values(n, r);
    const cats = [{ id: theme.anchor.id, name: theme.anchor.name, anchor: true,
      items: values.map(v => ({ name: theme.anchor.fmt(v), value: v, tags: [] })) }];
    const pool = theme.cats.slice();
    // names category first if present, then random others
    const person = pool.filter(c => c.person);
    const rest = shuffle(pool.filter(c => !c.person), r);
    const chosen = person.concat(rest).slice(0, (k || theme.k) - 1);
    for (const c of chosen) {
      const items = shuffle(c.items.slice(), r).slice(0, n).sort((a, b) => a.name.localeCompare(b.name));
      cats.push({ id: c.id, name: c.name, person: !!c.person, numeric: !!c.numeric, items });
    }
    // names: different first letters, none that echo an item or the title
    const pc = cats.find(c => c.person);
    if (pc && theme.pickNames) {
      const src = theme.cats.find(c => c.person).items.map(i => i.name);
      const picked = theme.pickNames(shuffle(src, r), n, { cats });
      if (picked) pc.items = picked.map(nm => ({ name: nm, tags: [] }));
    }
    // tag sets: a tag shared by 2..n-2 of a category's chosen items
    const tagSets = [];
    cats.forEach((c, ci) => {
      if (ci === 0) return;
      const tags = new Set(c.items.flatMap(i => i.tags || []));
      for (const t of tags) {
        const members = c.items.map((it, i) => (it.tags || []).includes(t) ? ci * n + i : -1).filter(x => x >= 0);
        if (members.length >= 2 && members.length <= n - 2) tagSets.push({ cat: ci, tag: t, members });
      }
    });
    return { theme: theme.id, title: theme.title, n, k: cats.length, cats, values, tagSets, clues: [] };
  }

  function makePool(P, sol, r, noAnchors) {
    const { n, k } = P, N = n * k;
    const byGroup = Array.from({ length: n }, () => []);
    for (let x = 0; x < N; x++) byGroup[sol[x]].push(x);
    const cat = x => Math.floor(x / n);
    // Hard never names an anchor value ("the driver who finished 3rd"): that pins clues straight onto the grid
    const refIn = (e, noAnchor) => {
      noAnchor = noAnchor || noAnchors;
      const opts = byGroup[e].filter(x => !(noAnchor && x < n));
      // anchors are allowed but rarer
      const w = opts.filter(x => x >= n);
      return r() < 0.15 && !noAnchor ? pick(opts, r) : pick(w.length ? w : opts, r);
    };
    const otherGroup = e => { let f; do { f = Math.floor(r() * n); } while (f === e); return f; };
    const pool = [], keys = new Set();
    const add = (c) => {
      const key = c.type + ':' + c.refs.join(',') + ':' + (c.d || '') + ':' + (c.dir || '');
      if (keys.has(key) || new Set(c.refs).size !== c.refs.length) return;
      keys.add(key); pool.push(c);
    };
    // pool size grows with the grid (tuned at 5x5; never smaller than that)
    const f = Math.max(1, (n * n) / 25);
    const base = { same: 8, diff: 14, either: 16, pair: 16, alldiff: 4, less: 12, by: 10 };
    const want = {}; for (const t in base) want[t] = Math.round(base[t] * f);
    let guard = 0;
    for (const type in want) {
      let made = 0;
      while (made < want[type] && guard++ < 5000) {
        const before = pool.length;
        const e1 = Math.floor(r() * n), e2 = otherGroup(e1);
        if (type === 'same') {
          const a = refIn(e1), b = refIn(e1);
          if (cat(a) !== cat(b)) add({ type, refs: [a, b] });
        } else if (type === 'diff') {
          const a = refIn(e1), b = refIn(e2);
          if (cat(a) !== cat(b)) add({ type, refs: [a, b] });
        } else if (type === 'either') {
          const a = refIn(e1), b = refIn(e1), c = refIn(e2);
          if (cat(b) !== cat(a) && cat(c) !== cat(a)) add({ type, refs: r() < 0.5 ? [a, b, c] : [a, c, b] });
        } else if (type === 'pair') {
          const a1 = refIn(e1), a2 = refIn(e2), b1 = refIn(e1), b2 = refIn(e2);
          if (cat(a1) !== cat(b1) && cat(a2) !== cat(b2) && cat(a1) !== cat(b2) && cat(a2) !== cat(b1))
            add({ type, refs: r() < 0.5 ? [a1, a2, b1, b2] : [a1, a2, b2, b1] });
        } else if (type === 'alldiff') {
          const size = n >= 5 && r() < 0.5 ? 5 : 4;
          const gs = shuffle([...Array(n).keys()], r).slice(0, Math.min(size, n));
          const refs = gs.map(e => refIn(e, true));
          // a useful list mixes categories: at most two plain names, three+ categories where possible
          const names = refs.filter(x => P.cats[cat(x)].person).length;
          if (names <= 2 && new Set(refs.map(cat)).size >= Math.min(3, k - 1)) add({ type, refs });
        } else if (type === 'less' || type === 'by') {
          const a = refIn(e1, true), b = refIn(e2, true);
          const [lo, hi] = P.values[e1] < P.values[e2] ? [a, b] : [b, a];
          if (type === 'less') add({ type, refs: [lo, hi] });
          else add({ type, refs: [lo, hi], d: Math.abs(P.values[e1] - P.values[e2]) });
        }
        if (pool.length > before) made++;
      }
    }
    // numeric comparisons on a second numeric category (e.g. age), alongside the anchor
    const nc = P.cats.findIndex((c, i) => i > 0 && c.numeric);
    if (nc > 0) {
      const S = []; for (let i = 0; i < n; i++) S.push(nc * n + i);
      const sv = S.map(x => P.cats[nc].items[x % n].value);
      const valOf = e => sv[S.findIndex(x => sol[x] === e)];
      const subjIn = e => { const o = byGroup[e].filter(x => cat(x) !== nc); const w = o.filter(x => x >= n); return r() < 0.15 && !noAnchors ? pick(o, r) : pick(w, r); };
      const nWant = { nless: Math.round(10 * f), nby: Math.round(8 * f) };
      for (const type in nWant) for (let i = 0, made = 0; made < nWant[type] && i < 400; i++) {
        const e1 = Math.floor(r() * n), e2 = otherGroup(e1);
        const [lo, hi] = valOf(e1) < valOf(e2) ? [e1, e2] : [e2, e1];
        const a = subjIn(lo), b = subjIn(hi), before = pool.length;
        add(type === 'nless' ? { type, refs: [a, b, ...S], sv, cat: nc } : { type, refs: [a, b, ...S], sv, cat: nc, d: valOf(hi) - valOf(lo) });
        if (pool.length > before) made++;
      }
    }
    // set clues from tag groups
    for (const ts of P.tagSets) {
      const memberGroups = ts.members.map(x => sol[x]);
      const others = [...Array(n).keys()].filter(e => !memberGroups.includes(e));
      const xIn = (e, noAnchor) => { const o = byGroup[e].filter(x => cat(x) !== ts.cat && !((noAnchor || noAnchors) && x < n)); return o.length ? pick(o, r) : -1; };
      for (let i = 0; i < 4; i++) {
        const a = xIn(pick(memberGroups, r)); if (a >= 0) add({ type: 'oneOf', refs: [a, ...ts.members], tag: ts.tag });
        const b = xIn(pick(others, r)); if (b >= 0) add({ type: 'noneOf', refs: [b, ...ts.members], tag: ts.tag });
      }
      const mv = memberGroups.map(e => P.values[e]);
      const above = others.filter(e => P.values[e] > Math.max(...mv)), below = others.filter(e => P.values[e] < Math.min(...mv));
      for (let i = 0; i < 3; i++) {
        if (above.length) { const x = xIn(pick(above, r), true); if (x >= 0) add({ type: 'setOrder', refs: [x, ...ts.members], dir: 1, tag: ts.tag }); }
        if (below.length) { const x = xIn(pick(below, r), true); if (x >= 0) add({ type: 'setOrder', refs: [x, ...ts.members], dir: -1, tag: ts.tag }); }
      }
    }
    return pool;
  }

  // weight: how "interesting" a clue type is (giveaways sink to the end)
  const WEIGHT = { nless: 1.1, nby: 1.1, same: 0.15, diff: 0.6, either: 1.2, pair: 1.1, alldiff: 0.9, less: 1.0, by: 1.0, oneOf: 1.3, noneOf: 1.0, setOrder: 1.4 };

  function weightedOrder(pool, r, target) {
    const W = Object.assign({}, WEIGHT, { same: [0, 1.0, 0.35, 0.2][target] });
    return pool.map(c => [c, Math.pow(r(), 1 / W[c.type])]).sort((a, b) => b[1] - a[1]).map(a => a[0]);
  }

  // bump when a change makes old seeds build different puzzles (saved games check this)
  const GEN_VERSION = 5;

  // Hard, by size (categories x items). On the easiest route (best move at every sticking point):
  //   minHard  = two-clue moments the solve must need (Nick's favourite 4x5 had 9)
  //   lastHard = how far through the solve the last of them must come
  function hardBar(k, n) {
    const cells = k * n;
    return cells <= 9 ? { minHard: 1, lastHard: 0.15 } : cells <= 12 ? { minHard: 3, lastHard: 0.4 }
      : cells <= 16 ? { minHard: 3, lastHard: 0.45 } : cells <= 20 ? { minHard: 6, lastHard: 0.45 } : { minHard: 6, lastHard: 0.5 };
  }

  // Clue mix every puzzle starts from (Nick's recipe). Small grids get a cut-down version.
  function recipe(target, k, n, r) {
    const big = n >= 4, full = k * n >= 16;
    if (target === 3) {
      // Hard follows Nick's favourite puzzle: no freebies (no ticks, no one-off crosses);
      // interlocking exact gaps, pair clues and either/or clues instead.
      return {
        alldiff: full ? 1 : 0,
        pair: full ? 2 : 1,
        by: big ? 2 : 0,
        less: 1,
        either: full ? 1 : 0,
      };
    }
    return {
      alldiff: full ? 1 : 0,
      pair: 1,
      less: 1,
      by: big ? 1 : 0,
      diff: target === 1 ? 3 : big ? 2 : 1,
      same: target === 1 ? 2 : big ? 1 : 0,
    };
  }

  // Items a reader actually sees named in the clue (not the hidden member lists of group/number clues)
  function shown(c) {
    if (c.type === 'oneOf' || c.type === 'noneOf' || c.type === 'setOrder') return [c.refs[0]];
    if (c.type === 'nless' || c.type === 'nby') return c.refs.slice(0, 2);
    return c.refs;
  }

  // Cells decided across every grid
  function decided(S) {
    const { n, k } = S; let d = 0;
    for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++)
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (S.rel(a * n + i, b * n + j) !== 0) d++;
    return d;
  }

  // Easiest route through the puzzle. Mechanical moves (tier 1) run to a standstill; each standstill is a
  // sticking point. There we take the single-clue move (level 2) that gets furthest, or if none exists the
  // two-clue move (level 3) that gets furthest. The result says where the thinking happens.
  function route(P, clues, direct) {
    const total = P.k * (P.k - 1) / 2 * P.n * P.n, ctx = makeCtx(P, clues, direct);
    const settle = S => solve(P, clues, 1, { state: S, ctx }).state;
    const tryMarks = (S, marks) => { const T = S.clone(); for (const m of marks) T.mark(m[0], m[1], m[2]); return settle(T); };
    let S = settle(new State(P));
    const stuck = [];
    while (!S.solved() && !S.bad && stuck.length < 80) {
      const at = decided(S) / total;
      let best = null, bestD = -1, level = 2;
      for (const c of clues) {
        if (c.type === 'same' || c.type === 'diff') continue;
        const res = enumerate(S, [c], 20000);
        if (res.count <= 0 || !res.marks.length) continue;
        const C = tryMarks(S, res.marks), d = decided(C);
        if (d > bestD) { bestD = d; best = C; }
      }
      if (!best) {
        level = 3;
        for (let i = 0; i < clues.length; i++) for (let j = i + 1; j < clues.length; j++) {
          if (!linked(S, clues[i], clues[j])) continue;
          const res = enumerate(S, [clues[i], clues[j]], 60000);
          if (res.count <= 0 || !res.marks.length) continue;
          const C = tryMarks(S, res.marks), d = decided(C);
          if (d > bestD) { bestD = d; best = C; }
        }
      }
      if (!best) return { ok: false, stuck, lastHard: 0, late: 0, hard: 0 };
      stuck.push({ at, gain: bestD / total - at, level });
      S = best;
    }
    const hardPts = stuck.filter(x => x.level === 3);
    return {
      ok: S.solved(), stuck,
      hard: hardPts.length,
      lastHard: hardPts.length ? Math.max(...hardPts.map(x => x.at)) : 0,
      late: stuck.filter(x => x.at >= 0.5).length, // sticking points of any level in the second half
    };
  }

  function generate(theme, opts) {
    opts = opts || {};
    const difficulty = opts.difficulty || 'medium';
    const target = TIER[difficulty];
    const seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 2 ** 31);
    const r = rng(seed);
    const n = opts.n || 5;
    for (let attempt = 0; attempt < (opts.attempts || 250); attempt++) {
      const P = buildPuzzle(theme, r, n, opts.k);
      const N = P.n * P.k;
      const sol = [];
      for (let i = 0; i < n; i++) sol.push(i);
      for (let c = 1; c < P.k; c++) sol.push(...shuffle([...Array(n).keys()], r));
      let pool = makePool(P, sol, r, target === 3 && P.k * n > 12 && !opts.anchorsInHard).map((c, i) => Object.assign(c, { id: i }));
      const direct = directOf(P);
      const solves = (cl, tier) => solve(P, cl, tier, { ctx: makeCtx(P, cl, direct) }).status === 'solved';
      // ---- build from a recipe, then fill ----
      // The recipe gives every puzzle the mix a good hand-made one has: a "the five are..." list,
      // a pair clue, ordering clues, a couple of one-off crosses and (usually) a tick.
      const want = recipe(target, P.k, n, r);
      const use = new Map(); // item -> times mentioned in chosen clues
      const capUse = P.k * n <= 9 ? 2 : 3;
      const fits = c => shown(c).every(x => (use.get(x) || 0) < capUse);
      const take = c => { for (const x of shown(c)) use.set(x, (use.get(x) || 0) + 1); chosen.push(c); typeCount[c.type] = (typeCount[c.type] || 0) + 1; };
      const usage = c => shown(c).reduce((a, x) => a + (use.get(x) || 0), 0);
      const chosen = [], typeCount = {}, usedTags = new Set();
      let groupClues = 0;
      const byType = {};
      for (const c of shuffle(pool.slice(), r)) (byType[c.type] = byType[c.type] || []).push(c);
      let recipeOk = true;
      for (const t in want) for (let i = 0; i < want[t]; i++) {
        // least-mentioned items first, so no single item dominates
        const c = (byType[t] || []).filter(c => !chosen.includes(c) && fits(c)).sort((a, b) => usage(a) - usage(b))[0];
        if (!c) { recipeOk = false; break; }
        take(c);
      }
      if (!recipeOk) continue;
      const recipeSet = new Set(chosen);
      const grow = Math.max(1, n / 5); // bigger grids need more clues per type
      const cap = t => t === 'same' ? [0, 4, 2, 0][target] : t === 'diff' && target === 3 ? 1 : t === 'alldiff' ? 1 : (opts.typeCap || Math.ceil((target === 1 ? 6 : 3) * grow));
      let ok = chosen.length >= 3 && solves(chosen, target);
      const keyOf = new Map(weightedOrder(pool, r, target).map((c, i, a) => [c, a.length - i]));
      while (!ok) {
        // next filler: best weighted key, discounted by how often its items are already mentioned
        let best = null, bestScore = -1;
        for (const c of pool) {
          if (chosen.includes(c) || (typeCount[c.type] || 0) >= cap(c.type) || !fits(c)) continue;
          if (c.tag) { const tk = Math.floor(c.refs[1] / n) + ':' + c.tag; if (usedTags.has(tk) || groupClues >= 2) continue; }
          const score = keyOf.get(c) * Math.pow(0.6, usage(c));
          if (score > bestScore) { bestScore = score; best = c; }
        }
        if (!best) break;
        if (best.tag) { usedTags.add(Math.floor(best.refs[1] / n) + ':' + best.tag); groupClues++; }
        take(best);
        if (chosen.length >= 4) ok = solves(chosen, target);
      }
      if (!ok) continue;
      // Hard: local search. Swap one clue for another of the same kind, refill and re-trim,
      // keep the swap if the easiest route needs at least as much two-clue thinking. Time-boxed.
      const maxUse = cl => { const u = new Map(); for (const c of cl) for (const x of shown(c)) u.set(x, (u.get(x) || 0) + 1); return Math.max(0, ...u.values()); };
      const typeOk = cl => { const t = {}; for (const c of cl) t[c.type] = (t[c.type] || 0) + 1; return Object.keys(t).every(x => t[x] <= Math.max(cap(x), want[x] || 0)); };
      const rateOf = cl => { const rt = route(P, cl, direct); return { rt, score: rt.ok ? rt.hard + rt.lastHard : -1, done: rt.ok && rt.hard >= hb.minHard && rt.lastHard >= hb.lastHard }; };
      const hb = opts.hardBar || hardBar(P.k, n);
      function improveHard(start) {
        const budget = opts.improveMs != null ? opts.improveMs : (P.k * n <= 9 ? 150 : P.k * n <= 16 ? 500 : 1200);
        const t0 = Date.now();
        let best = start, bestR = rateOf(start), rec = new Set(start.filter(c => recipeSet.has(c)));
        while (Date.now() - t0 < budget && !bestR.done) {
          const out = pick(best, r), wasRecipe = rec.has(out);
          const opts2 = pool.filter(c => !best.includes(c) && (wasRecipe ? c.type === out.type : !recipeSet.has(c) && c.type !== 'same'));
          if (!opts2.length) continue;
          const repl = pick(opts2, r);
          let cand = best.filter(c => c !== out).concat([repl]);
          // refill until solvable at Hard
          let guard = 0, added = [];
          while (!solves(cand, 3) && guard++ < 8) {
            const add = pool.filter(c => !cand.includes(c) && c.type !== 'same' && !recipeSet.has(c));
            if (!add.length) break;
            const a = pick(add, r); cand.push(a); added.push(a);
          }
          if (guard >= 8 || (guard > 0 && !added.length)) continue;
          const keep = new Set(cand.filter(c => rec.has(c) || (wasRecipe && c === repl)));
          // trim only what this move added plus two random fillers (full re-trims were 88% of the time)
          const others = shuffle(cand.filter(c => !keep.has(c) && !added.includes(c) && c !== repl), r).slice(0, 2);
          for (const c of shuffle(added.concat(others), r)) {
            const trial = cand.filter(x => x !== c);
            if (solves(trial, 3)) cand = trial;
          }
          if (solves(cand, 2) || maxUse(cand) > capUse || !typeOk(cand)) continue;
          const cr = rateOf(cand);
          if (cr.score >= bestR.score) { best = cand; bestR = cr; rec = keep; }
        }
        lastRate = bestR.rt;
        return best;
      }
      // minimise: only the fillers can go (giveaways first); recipe clues stay
      const order = shuffle(chosen.filter(c => !recipeSet.has(c)), r).sort((a, b) => WEIGHT[a.type] - WEIGHT[b.type]);
      let kept = chosen.slice();
      for (const c of order) {
        const trial = kept.filter(x => x !== c);
        if (solves(trial, target)) kept = trial;
      }
      if (target > 1 && solves(kept, target - 1)) continue; // too easy for this level
      let lastRate = null;
      if (target === 3) {
        kept = improveHard(kept);
        // no spare clues: anything the puzzle can be reasoned out without goes, recipe clues included
        const before = kept.length;
        for (const c of shuffle(kept.slice(), r)) { const t = kept.filter(x => x !== c); if (solves(t, 3)) kept = t; }
        if (kept.length !== before) lastRate = route(P, kept, direct);
      }
      // finalise
      kept = shuffle(kept, r).map((c, i) => Object.assign({}, c, { id: i + 1 }));
      if (target === 3) {
        // Hard = the thinking lasts. On the easiest route (best combined-clue move each time
        // simple moves run out), no single move may open up too much of the grid, and enough
        // sticking points must come late in the solve.
        const rt = lastRate; // rated on the final clue set inside improveHard (clue order doesn't matter)
        if (!rt.ok || rt.hard < hb.minHard || rt.lastHard < hb.lastHard) continue;
        P.route = rt;
      }
      P.clues = kept;
      P.solution = sol;
      P.difficulty = difficulty;
      P.seed = seed;
      P.attempts = attempt + 1;
      const res = solve(P, kept, target);
      P.proof = res.steps;
      if (theme.text) theme.text(P, r);
      return P;
    }
    return null;
  }

  // ---------- skeleton bank ----------
  // A skeleton is a finished puzzle with the labels stripped off: clue types, which item slots they
  // mention, and the answer. Reskinning shuffles which item fills which slot in every category,
  // may flip the order (1st <-> last, "ahead" <-> "behind"), and dresses it in a theme. The logic is
  // identical, so uniqueness and difficulty carry over; to a person it's a new puzzle.
  const SKEL_TYPES = new Set(['same', 'diff', 'either', 'pair', 'alldiff', 'less', 'by']);
  function toSkeleton(P) {
    return { k: P.k, n: P.n, sol: P.solution.slice(), hard: P.route ? P.route.hard : 0,
      last: P.route ? Math.round(P.route.lastHard * 100) / 100 : 0,
      clues: P.clues.map(c => c.type === 'by' ? [c.type, c.refs.slice(), c.d / (P.values[1] - P.values[0])] : [c.type, c.refs.slice()]) };
  }
  function reskin(theme, sk, opts) {
    opts = opts || {};
    const seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 2 ** 31);
    const r = rng(seed), n = sk.n, k = sk.k;
    const P = buildPuzzle(theme, r, n, k);
    if (theme.anchor.evenValues) { // bank skeletons assume evenly spaced numbers
      P.values = theme.anchor.evenValues(n);
      P.cats[0].items = P.values.map(v => ({ name: theme.anchor.fmt(v), value: v, tags: [] }));
    }
    P.tagSets = [];
    const step = P.values[1] - P.values[0];
    const flip = opts.flip != null ? opts.flip : r() < 0.5;
    const g = e => flip ? n - 1 - e : e;            // group (= anchor slot) mapping
    const perm = [[...Array(n).keys()].map(g)];    // anchor items follow their group
    for (let c = 1; c < k; c++) perm.push(opts.keepSlots ? [...Array(n).keys()] : shuffle([...Array(n).keys()], r)); // keepSlots: tools that rewrite the bank
    const map = x => { const c = Math.floor(x / n); return c * n + perm[c][x % n]; };
    const sol = new Array(n * k);
    for (let x = 0; x < n * k; x++) sol[map(x)] = g(sk.sol[x]);
    const order = opts.keepSlots ? a => a : a => shuffle(a, r);
    P.clues = order(sk.clues.map(([type, refs, d]) => {
      let R = refs.map(map);
      if (flip && (type === 'less' || type === 'by')) R = [R[1], R[0]]; // the lower one is now the higher one
      return type === 'by' ? { type, refs: R, d: d * step } : { type, refs: R };
    })).map((c, i) => Object.assign(c, { id: i + 1 }));
    P.solution = sol;
    P.difficulty = opts.difficulty || 'hard';
    P.seed = seed;
    P.skeleton = opts.id || null;
    P.route = { hard: sk.hard, lastHard: sk.last };
    P.proof = solve(P, P.clues, 3).steps;
    if (theme.text) theme.text(P, r);
    return P;
  }

  // ---------- text for proof steps ----------
  function label(P, x) { const c = P.cats[Math.floor(x / P.n)]; return c.items[x % P.n].name; }
  function stepText(P, step) {
    const facts = step.marks.map(([x, y, v]) => `${label(P, x)} ${v === 1 ? '=' : '≠'} ${label(P, y)}`);
    const cl = step.clues.map(id => 'clue ' + id).join(' + ');
    const why = {
      direct: `Read ${cl} directly`,
      sweep: 'A confirmed match rules out the rest of its row and column',
      last: 'Only one option left',
      transfer: 'Carry known facts across grids (same thing, same facts)',
      compare: 'Compare the two grids',
      clue: `Apply ${cl} to what you know so far`,
      combine: `Combine ${cl}`,
    }[step.rule];
    return `${why}: ${facts.join(', ')}`;
  }

  // ---------- explanations ----------
  // For a clue-based step taken from state S, find the smallest set of grid facts
  // (about the clue's items) the step actually relies on.
  // combined-clue steps that need at least one fact from the grid (the genuinely hard moments)
  function deepSteps(P, clues, steps) {
    const S = new State(P);
    let count = 0;
    for (const st of steps) {
      if (st.tier === 3 && explain(P, S, st, clues).facts.length) count++;
      for (const m of st.marks) S.mark(m[0], m[1], m[2]);
    }
    return count;
  }

  function explain(P, S, step, clueList) {
    if (step.rule !== 'clue' && step.rule !== 'combine') return { facts: [] };
    const clues = step.clues.map(id => (clueList || P.clues).find(c => c.id === id));
    const refs = [];
    for (const c of clues) for (const r of c.refs) if (!refs.includes(r)) refs.push(r);
    const n = P.n, cat = x => Math.floor(x / n);
    const facts = [];
    for (const x of refs) {
      if (x < n) continue;
      for (let e = 0; e < n; e++) if (!(S.D[x] & (1 << e))) facts.push([e, x, -1]);
    }
    for (let i = 0; i < refs.length; i++) for (let j = i + 1; j < refs.length; j++) {
      const x = refs[i], y = refs[j];
      if (x < n || y < n || cat(x) === cat(y)) continue;
      const v = S.rel(x, y);
      if (v) facts.push([x, y, v]);
    }
    const works = (fs) => {
      const T = new State(P);
      for (const f of fs) T.mark(f[0], f[1], f[2]);
      const res = enumerate(T, clues, 200000);
      if (res.count <= 0) return false;
      for (const m of res.marks) T.mark(m[0], m[1], m[2]);
      return step.marks.every(m => T.rel(m[0], m[1]) === m[2]);
    };
    let kept = facts.slice();
    if (!works(kept)) return { facts: kept }; // shouldn't happen
    // try dropping relations first (they read as bigger leaps), then eliminations
    const order = facts.slice().sort((a, b) => (a[0] < n) - (b[0] < n));
    for (const f of order) {
      const trial = kept.filter(g => g !== f);
      if (works(trial)) kept = trial;
    }
    return { facts: kept };
  }

  // Readable lines for a set of facts: "Oxford: 2nd or 3rd", "Chloe = York"
  function factLines(P, S, facts) {
    const n = P.n, lines = [];
    const byItem = new Map();
    for (const f of facts) {
      if (f[0] < n) { if (!byItem.has(f[1])) byItem.set(f[1], []); byItem.get(f[1]).push(f[0]); }
      else lines.push(`${label(P, f[0])} ${f[2] === 1 ? '=' : '≠'} ${label(P, f[1])}`);
    }
    for (const [x, gone] of byItem) {
      const left = [];
      for (let e = 0; e < n; e++) if (S.D[x] & (1 << e)) left.push(label(P, e));
      const allGone = n - left.length;
      if (gone.length === allGone && left.length <= 3) lines.unshift(`${label(P, x)}: only ${left.join(' or ')}`);
      else lines.unshift(`${label(P, x)} ≠ ${gone.map(e => label(P, e)).join(', ')}`);
    }
    return lines;
  }

  const RULE_TEXT = {
    direct: 'This clue tells you something straight away.',
    sweep: 'A tick rules out everything else in its row and column.',
    last: 'Only one option is left.',
    transfer: 'Two things are the same person, so what you know about one applies to the other.',
    compare: 'Compare what you know about these two items.',
    clue: 'Apply this clue to what is already in your grid.',
    combine: 'These two clues work together.',
  };


  // ---------- "Why?" for clue steps ----------
  // Play out the opposite of a conclusion with only the facts the step uses, one clue at a time, until
  // something breaks: "If Ben = £6, clue 2 gives Audrey = £7 and Egg mayo = £5, and that leaves Kevin with no price left."
  // When the clues only break together, split on the item with fewest options: "Tuna could be £5 or £7: with £5, …; with £7, …".
  function whyNot(P, facts, step, m) {
    const n = P.n, k = P.k, N = n * k;
    const clues = step.clues.map(id => P.clues.find(c => c.id === id));
    const and = xs => xs.length > 1 ? xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1] : xs[0];
    const or = xs => xs.length > 1 ? xs.slice(0, -1).join(', ') + ' or ' + xs[xs.length - 1] : xs[0];
    const pair = (x, y, v) => { const [a, b] = x < n ? [y, x] : [x, y]; return `${label(P, a)} ${v === 1 ? '=' : '≠'} ${label(P, b)}`; };
    const posOf = (T, x) => { for (let y = 0; y < n; y++) if (T.D[x] === 1 << y) return y; return -1; };
    const optsOf = (T, x) => { const o = []; for (let e = 0; e < n; e++) if (T.D[x] & (1 << e)) o.push(e); return o; };
    function settle(T) {
      for (let guard = 0; guard < 50 && !T.bad; guard++) {
        let ch = false;
        for (let c = 1; c < k; c++) {
          for (let i = 0; i < n; i++) { const x = c * n + i, e = posOf(T, x); if (e < 0) continue;
            for (let j = 0; j < n; j++) if (j !== i) ch = T.mark(e, c * n + j, -1) || ch; }
          for (let e = 0; e < n; e++) {
            const cand = []; for (let i = 0; i < n; i++) if (T.D[c * n + i] & (1 << e)) cand.push(c * n + i);
            if (!cand.length) return { type: 'group', c, e };
            if (cand.length === 1) ch = T.mark(e, cand[0], 1) || ch;
          }
        }
        for (let x = n; x < N; x++) for (let y = x + 1; y < N; y++) {
          const r = T.R[x * N + y]; if (!r || T.cat(x) === T.cat(y)) continue;
          if (r === 1) { const d = T.D[x] & T.D[y]; if (T.D[x] !== d) { T.D[x] = d; ch = true; } if (T.D[y] !== d) { T.D[y] = d; ch = true; } }
          else { const ex = posOf(T, x), ey = posOf(T, y); if (ex >= 0) ch = T.mark(ex, y, -1) || ch; if (ey >= 0) ch = T.mark(ey, x, -1) || ch; }
        }
        for (let x = n; x < N; x++) if (!T.D[x]) return { type: 'item', x };
        if (!ch) break;
      }
      if (T.bad) { for (let x = n; x < N; x++) if (!T.D[x]) return { type: 'item', x }; return { type: 'grid' }; }
      return null;
    }
    // apply single clues until something breaks; returns { chain, broke }
    function run(T) {
      const chain = [];
      let broke = settle(T);
      for (let round = 0; round < 12 && !broke; round++) {
        let moved = false;
        for (const c of clues) {
          const had = new Set(); for (let x = n; x < N; x++) if (posOf(T, x) >= 0) had.add(x);
          const res = enumerate(T, [c], 200000);
          if (res.count === 0) { broke = { type: 'clue', id: c.id }; break; }
          let ch = false; for (const mk of res.marks) ch = T.mark(mk[0], mk[1], mk[2]) || ch;
          if (!ch) continue;
          broke = settle(T);
          const fresh = []; for (let x = n; x < N; x++) if (!had.has(x) && posOf(T, x) >= 0) fresh.push(x);
          if (fresh.length) chain.push(`clue ${c.id} gives ${and(fresh.map(x => pair(x, posOf(T, x), 1)))}`);
          moved = true; break;
        }
        if (!moved && !broke) { if (enumerate(T, clues, 200000).count === 0) broke = { type: 'clues' }; break; }
      }
      return { chain, broke, T };
    }
    // what broke, in words
    function ending(T, broke) {
      if (broke.type === 'item') return `that leaves ${label(P, broke.x)} with no ${P.cats[0].name.toLowerCase()} left`;
      if (broke.type === 'group') return `that leaves no ${P.cats[broke.c].name.toLowerCase()} for ${label(P, broke.e)}`;
      if (broke.type === 'clue') {
        return `clue ${broke.id} can't be true`;
      }
      if (broke.type === 'clues') return `clues ${step.clues.join(' and ')} can't both be true`;
      return 'the grid contradicts itself';
    }
    const T = new State(P);
    for (const f of facts) T.mark(f[0], f[1], f[2]);
    T.mark(m[0], m[1], -m[2]);
    const r = run(T);
    if (!r.broke) return null;
    let s = `If ${pair(m[0], m[1], -m[2])}`;
    if (r.chain.length) s += ', ' + r.chain.join(', then ');
    if (r.broke.type !== 'clues') return s + (r.chain.length ? ', and ' : ', ') + ending(r.T, r.broke) + '.';
    // the clues only break together: try each option of a clue item, fewest options first
    const refs = [...new Set(clues.flatMap(c => c.refs))].filter(x => x >= n).map(x => [x, optsOf(r.T, x)]).filter(([, o]) => o.length > 1).sort((a, b) => a[1].length - b[1].length);
    for (const [x, o] of refs) {
      const branches = [];
      for (const e of o) {
        const T2 = r.T.clone(); T2.mark(e, x, 1);
        const b = run(T2);
        if (!b.broke || b.broke.type === 'clues' || (b.broke.type === 'item' && b.broke.x === x)) { branches.length = 0; break; }
        branches.push(`with ${label(P, e)}, ${b.chain.length ? b.chain.join(', then ') + ', and ' : ''}${ending(b.T, b.broke)}`);
      }
      if (!branches.length) continue;
      const lead = s + `${r.chain.length ? ', so' : ','} ${label(P, x)} could only be ${or(o.map(e => label(P, e)))}`;
      const ends = [...new Set(branches.map(b => b.replace(/^with [^,]+, /, '')))];
      const out = ends.length === 1 && /can't be true$/.test(ends[0])
        ? lead + `, and ${ends[0].replace(/can't be true$/, `can't be true with ${o.length > 2 ? 'any of them' : 'either'}`)}.`
        : lead + `: ${branches.join('; ')}.`;
      if (out.length <= 260) return out;
    }
    return r.chain.length ? s + ', and ' + ending(r.T, r.broke) + '.' : null; // a bare "can't both be true" adds nothing
  }

  // Hint from the player's marks: [[x, y, v], ...]
  function hint(P, marks, maxTier) {
    const tier = maxTier || { easy: 1, medium: 2, hard: 3, fiendish: 3 }[P.difficulty] || 3;
    const sol = P.solution;
    const wrong = marks.filter(([x, y, v]) => (sol[x] === sol[y]) !== (v === 1));
    if (wrong.length) return { type: 'mistake', wrong };
    const S = new State(P);
    for (const m of marks) S.mark(m[0], m[1], m[2]);
    if (S.solved()) return { type: 'solved' };
    const before = S.clone();
    const res = solve(P, P.clues, 3, { state: S, firstOnly: true, ctx: makeCtx(P, P.clues) });
    const step = res.steps[0];
    if (!step) return { type: 'stuck' };
    const ex = explain(P, before, step);
    // a clue your grid already covers in full (one you'd rightly have crossed off) isn't named: say "this clue + your grid"
    // and show the grid facts that stand in for it ("Ringo = Red")
    let shownClues = step.clues, rule = step.rule, gridFacts = [], hiddenFacts = []; // hidden: "≠" facts the Why? needs but the list doesn't
    if (step.rule === 'combine') {
      const spent = step.clues.filter(id => {
        const c = P.clues.find(c => c.id === id), a = enumerate(before, [c], 200000), b = enumerate(before, [{ type: 'any', refs: c.refs }], 200000);
        return a.count > 0 && a.count === b.count;
      });
      if (spent.length === 1) {
        shownClues = step.clues.filter(id => !spent.includes(id)); rule = 'clue';
        const c = P.clues.find(c => c.id === spent[0]), n = P.n, pc = P.cats.findIndex(c => c.person);
        for (const x of c.refs) {
          if (x < n) continue;
          if (Math.floor(x / n) === pc) continue;
          if (pc > 0) for (let y = pc * n; y < (pc + 1) * n; y++) if (before.rel(x, y) === 1) gridFacts.push([y, x, 1]);
        }
        for (const x of c.refs) if (x >= n) for (let e = 0; e < n; e++) if (!(before.D[x] & (1 << e)) && !ex.facts.some(f => f[0] === e && f[1] === x)) gridFacts.push([e, x, -1]);
        for (let i = 0; i < c.refs.length; i++) for (let j = i + 1; j < c.refs.length; j++) {
          const x = c.refs[i], y = c.refs[j]; if (x < n || y < n || Math.floor(x / n) === Math.floor(y / n)) continue;
          const v = before.rel(x, y); if (v && !gridFacts.some(f => f.includes(x) && f.includes(y))) (v === 1 ? gridFacts : hiddenFacts).push([x, y, v]);
        }
      }
    }
    const allFacts = ex.facts.concat(gridFacts);
    const items = new Set();
    for (const id of step.clues) for (const r of P.clues.find(c => c.id === id).refs) items.add(r);
    for (const m of step.marks) { items.add(m[0]); items.add(m[1]); }
    if (step.focus) step.focus.forEach(x => items.add(x));
    return {
      type: 'step', tier: step.tier, rule, clues: shownClues,
      look: RULE_TEXT[rule],
      facts: factLines(P, before, allFacts),
      factMarks: allFacts,
      marks: step.marks,
      conclusion: step.marks.map(([x, y, v]) => `${label(P, x)} ${v === 1 ? '=' : '≠'} ${label(P, y)}`),
      why: (step.rule === 'clue' || step.rule === 'combine') ? step.marks.slice(0, 3).map(m => whyNot(P, allFacts.concat(hiddenFacts), step, m)).filter(w => w && w.length <= 260) : [],
      items: [...items],
    };
  }

  const api = { SKEL_TYPES, toSkeleton, reskin, route, recipe, shown, GEN_VERSION, hardBar, deepSteps, rng, generate, solve, countSolutions, State, enumerate, stepText, label, clueHolds, makeCtx, explain, factLines, hint };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LPEngine = api;
}
LPEngineFactory(typeof self !== 'undefined' ? self : this);
