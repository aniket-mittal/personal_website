// node tests/tracks.test.mjs — geometric assertions for all five circuits.
import { TRACKS, allTracks } from '../tracks.js';

const MAX_CURV = 0.09, MIN_LEN = 900, MAX_LEN = 1400, HALF_SPAN = 260;
let failures = 0;
const fail = (msg) => { failures++; console.log('  FAIL ' + msg); };

const rows = [];
const tracks = allTracks();
if (tracks.length !== 5 || TRACKS.length !== 5) fail(`expected 5 tracks, got ${tracks.length}`);

for (const t of tracks) {
  const def = TRACKS.find((d) => d.id === t.id);
  const problems = [];
  // lap length, sampling and bounds
  if (!(t.length >= MIN_LEN && t.length <= MAX_LEN)) problems.push(`lap length ${t.length} outside ${MIN_LEN}–${MAX_LEN}`);
  if (t.n !== t.length / t.ds || t.x.length !== t.n) problems.push(`sampling: n=${t.n} length=${t.length} ds=${t.ds}`);
  const { minX, maxX, minZ, maxZ } = t.bounds;
  if (Math.max(-minX, maxX, -minZ, maxZ) > HALF_SPAN) problems.push(`bounds exceed ±${HALF_SPAN} m: ${JSON.stringify(t.bounds)}`);
  // equal arc-length spacing
  let maxGap = 0;
  for (let i = 0; i < t.n; i++) { const j = (i + 1) % t.n; maxGap = Math.max(maxGap, Math.abs(Math.hypot(t.x[j] - t.x[i], t.z[j] - t.z[i]) - t.ds)); }
  if (maxGap > 0.05) problems.push(`samples not 1 m apart (max error ${maxGap.toFixed(3)})`);
  // curvature
  let maxK = 0, meanK = 0;
  for (let i = 0; i < t.n; i++) { const a = Math.abs(t.curv[i]); if (a > maxK) maxK = a; meanK += a; }
  meanK /= t.n;
  if (maxK > MAX_CURV) problems.push(`max |curv| ${maxK.toFixed(4)} > ${MAX_CURV}`);
  // direction of travel matches the def
  let area = 0;
  for (let i = 0; i < t.n; i++) { const j = (i + 1) % t.n; area += t.x[i] * t.z[j] - t.x[j] * t.z[i]; }
  const clockwise = area > 0;
  if (clockwise !== !!def.clockwise) problems.push(`direction: sampled ${clockwise ? 'clockwise' : 'anticlockwise'}, def says ${def.clockwise ? 'clockwise' : 'anticlockwise'}`);
  // a clockwise lap is mostly right turns (negative curvature)
  let sumK = 0; for (let i = 0; i < t.n; i++) sumK += t.curv[i];
  if ((sumK < 0) !== clockwise) problems.push(`curvature sign convention: total ${sumK.toFixed(2)} for a ${clockwise ? 'clockwise' : 'anticlockwise'} lap`);
  if (Math.abs(Math.abs(sumK) - 2 * Math.PI) > 0.2) problems.push(`total turning ${sumK.toFixed(3)} ≠ ±2π`);
  // no self-intersection: samples > 30 m apart in s must be > 2*hw + 8 apart
  const minDist = 2 * t.hw + 8;
  let minSep = Infinity, sepAt = null;
  const cell = 20, cols = Math.ceil((maxX - minX) / cell) + 1;
  const grid = new Map();
  for (let i = 0; i < t.n; i++) {
    const key = Math.floor((t.x[i] - minX) / cell) + cols * Math.floor((t.z[i] - minZ) / cell);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(i);
  }
  for (let i = 0; i < t.n; i++) {
    const cx = Math.floor((t.x[i] - minX) / cell), cz = Math.floor((t.z[i] - minZ) / cell);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const bucket = grid.get(cx + dx + cols * (cz + dz));
      if (!bucket) continue;
      for (const j of bucket) {
        const along = Math.abs(i - j);
        if (Math.min(along, t.n - along) <= 30) continue;
        const dd = Math.hypot(t.x[i] - t.x[j], t.z[i] - t.z[j]);
        if (dd < minSep) { minSep = dd; sepAt = [i, j]; }
      }
    }
  }
  if (minSep <= minDist) problems.push(`self-intersection: samples ${sepAt} only ${minSep.toFixed(1)} m apart`);
  // API sanity
  const p = t.pose(123.4), q = t.pose(123.4 + t.length);
  if (Math.abs(p.x - q.x) > 1e-9 || Math.abs(p.z - q.z) > 1e-9) problems.push('pose(s) does not wrap');
  const pr = t.project(p.x + 2 * Math.cos(p.theta), p.z - 2 * Math.sin(p.theta), 100);
  if (Math.abs(pr.d - 2) > 0.1 || Math.abs(pr.s - 123.4) > 1.5) problems.push(`project(): d=${pr.d.toFixed(2)} s=${pr.s.toFixed(1)} expected d=2 s=123.4`);
  const prG = t.project(p.x, p.z);
  if (Math.abs(prG.s - 123.4) > 1.5) problems.push(`global project(): s=${prG.s.toFixed(1)} expected 123.4`);
  if (Math.abs(t.curvAt(50.5) - (t.curv[50] + t.curv[51]) / 2) > 1e-9) problems.push('curvAt() is not linear interpolation');
  // a purely lateral offset from the start line (the race spawn) must project to 0 <= s < 1, never s === length
  { const p0 = t.pose(0);
    for (const off of [-2.2, 2.2]) {
      const ps = t.project(p0.x + off * Math.cos(p0.theta), p0.z - off * Math.sin(p0.theta));
      if (!(ps.s >= 0 && ps.s < 1)) problems.push(`project() of the start line offset ${off} m gives s=${ps.s} (length ${t.length})`);
    } }
  if (!(t.banners.length >= 4 && t.banners.length <= 7)) problems.push(`banners: ${t.banners.length}`);
  if (!(def.points.length >= 18 && def.points.length <= 80)) problems.push(`control points: ${def.points.length}`);

  rows.push({
    circuit: t.circuit, dir: clockwise ? 'cw' : 'acw', pts: def.points.length, scale: `1:${t.scale}`,
    length: t.length, maxK: maxK.toFixed(4), minR: (1 / maxK).toFixed(1), minSep: minSep.toFixed(1),
    span: `${(maxX - minX).toFixed(0)}×${(maxZ - minZ).toFixed(0)}`, ok: problems.length === 0 ? 'ok' : 'FAIL',
  });
  for (const pbm of problems) fail(`${t.circuit}: ${pbm}`);
}

const cols = Object.keys(rows[0]);
const widths = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c]).length)));
const line = (vals) => vals.map((v, i) => String(v).padEnd(widths[i])).join('  ');
console.log(line(cols));
console.log(line(widths.map((w) => '-'.repeat(w))));
for (const r of rows) console.log(line(cols.map((c) => r[c])));
console.log(failures ? `\n${failures} failure(s)` : '\nall track checks passed');
process.exit(failures ? 1 : 0);
