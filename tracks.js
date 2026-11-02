// ============================================================
//  tracks.js — five real F1 circuits, scaled to ~1:4, as closed
//  centripetal Catmull-Rom loops, resampled at 1 m of arc length.
//
//  Pure JS: no three.js, so it can be tested in Node
//  (`node tests/tracks.test.mjs`). See docs/DESIGN.md for the contract.
//
//  Conventions: metres, the track lives in the xz plane, y is up.
//  Heading theta: forward = (-sin θ, -cos θ), right = (cos θ, -sin θ);
//  positive curvature = left turn. Lateral offset d is positive to the right.
//  Looking down from +y with x to the right, +z points down the map, so a
//  "clockwise" circuit has positive shoelace area in (x, z) and mostly
//  negative curvature.
// ============================================================

export const HALF_WIDTH = 5.5;
const DS = 1.0;

// Control points were drawn by laying out each circuit's real corner
// sequence (turn angles and radii, scaled ≈ 1:4 to 1:6) and sampling the
// result at a curvature-adaptive spacing: ~35° per point through tight
// corners, up to 110 m on straights. That is denser than the 18–40 points
// first aimed for (39–55 here) because the centripetal spline overshoots
// the curvature of sparsely sampled arcs by ~1.35×. Hairpins are opened up
// to a ≥ 13 m radius so the car's steering lock (max |κ| = 0.09, R ≈ 11 m)
// can take them. `scale` is the real lap length over the model lap length.

/** @type {Array<{id:string,name:string,circuit:string,scale:number,clockwise:boolean,points:number[][],startIndex:number,banners:string[]}>} */
export const TRACKS = [
  {
    id: 'about', name: 'About', circuit: 'Silverstone', scale: 4.23, clockwise: true,
    startIndex: 0,
    banners: ['Berkeley', 'machine learning', 'robotics', 'systems', 'writing', 'formula one'],
    points: [
      [-105.3, 142.3], [-68.7, 41.9], [-60.6, 24.3], [-44.3, 13.2], [-25.9, 11.7], [-9.2, 4.1],
      [-1.3, -4.9], [7.9, -10.7], [18.8, -10.2], [27.3, -3.5], [31.5, 6.1], [36.2, 15.4],
      [45.1, 20.7], [55.3, 19.8], [63.2, 13.1], [65.8, 3.1], [65.8, -8.9], [61.8, -23.8],
      [50.4, -35], [-19.2, -93.3], [-29.8, -101.6], [-43.4, -104], [-55.3, -98.2], [-64.1, -88],
      [-74.4, -79.5], [-87.7, -78.3], [-99.2, -85], [-104.7, -97.2], [-102, -110.7], [-93.6, -121.2],
      [-33.2, -193.2], [-16.6, -208], [4.9, -210.9], [24.5, -200.7], [51.6, -162.9], [71.4, -138],
      [90, -130.2], [105.8, -120.9], [113.2, -104.2], [112.7, -85.4], [118.8, -65.6], [116, -38.2],
      [85.1, 46.8], [47.6, 149.7], [33.9, 186.3], [19.5, 199.7], [0.4, 202.3], [-46, 194.1],
      [-59.4, 192.6], [-71.7, 197.9], [-82.5, 206.8], [-96.2, 210.9], [-110.1, 206.3], [-118.8, 194.4],
      [-118.8, 179.7],
    ],
  },
  {
    id: 'projects', name: 'Projects', circuit: 'Spa-Francorchamps', scale: 5.71, clockwise: true,
    startIndex: 0,
    banners: ['projects', 'open source', 'research', 'prototypes', 'demos'],
    points: [
      [-175.1, -36], [-203.2, -64.1], [-209.5, -72.9], [-209.5, -83.3], [-203.6, -91.7], [-193.9, -95.2],
      [-184, -92.4], [-171.7, -83.8], [-117.6, -46], [-97.2, -39.9], [-76.1, -45.6], [-54.4, -44.3],
      [-28.7, -47.9], [19.2, -80.6], [95.4, -134], [104.9, -140.4], [115.6, -141.9], [125.6, -136.6],
      [131.1, -127.2], [137.5, -116.5], [149.3, -110.3], [163.2, -109], [177.9, -104.6], [187.5, -92.6],
      [205.2, -54.6], [209.5, -44.6], [208.9, -33.8], [201.8, -25.1], [191.4, -22.3], [180.8, -26.2],
      [173, -33.9], [147.3, -56.7], [120.1, -61.5], [95.2, -49.4], [81.9, -25.2], [67.1, 30],
      [60.9, 44.1], [48.3, 52], [35.4, 60.3], [29.3, 74.5], [20.4, 107.8], [7.9, 125.4],
      [-7.3, 136], [-21.4, 141.9], [-36.2, 138.6], [-46.6, 127.3], [-73.9, 81.5], [-130.8, 40.6],
      [-147, 33], [-155.2, 25.3], [-157.2, 14.3], [-153.4, 4.1], [-151.6, -7.2], [-156.6, -17.5],
    ],
  },
  {
    id: 'experience', name: 'Experience', circuit: 'Monza', scale: 4.94, clockwise: true,
    startIndex: 1,
    banners: ['experience', 'internships', 'teaching', 'industry', 'education'],
    points: [
      [-167.1, 147.6], [-140.4, 74.2], [-102.4, -30.3], [-82.3, -85.3], [-76.3, -96.1], [-65.3, -101.6],
      [-52.9, -101.8], [-40.2, -107], [-33, -118.1], [-22.2, -146.7], [7.6, -177.5], [50.3, -185.1],
      [75.1, -180.8], [87.3, -181.4], [97.4, -189.2], [106.7, -198.3], [119.7, -201.2], [133.9, -198.8],
      [149.7, -192.3], [159.3, -177.5], [165.9, -159.2], [167.9, -146], [161.6, -133.7], [149.9, -127.2],
      [82.5, -102.7], [15.7, -71.1], [-30.8, -17.4], [-39.7, -4.3], [-40.3, 10.9], [-39.6, 27.3],
      [-48.4, 42.2], [-63, 51.9], [-72.5, 68.2], [-82.5, 124.8], [-91.9, 174.9], [-107.1, 194.4],
      [-130.7, 201.2], [-153.9, 192.9], [-167.9, 172.6],
    ],
  },
  {
    id: 'hobbies', name: 'Hobbies', circuit: 'Interlagos', scale: 4.33, clockwise: false,
    startIndex: 0,
    banners: ['hobbies', 'formula one', 'running', 'cooking', 'reading'],
    points: [
      [21.9, -118.8], [-85.2, -99.9], [-109.8, -95.6], [-120.5, -89.6], [-125.6, -79], [-125.9, -66.5],
      [-130.8, -54.1], [-141.6, -46.2], [-156.3, -34.4], [-163.5, -13.5], [-157.4, 7.3], [-140.7, 21.2],
      [-60.3, 67.6], [25, 116.9], [41.8, 124.4], [59.4, 122.1], [74.6, 110.8], [88.6, 87.7],
      [93.3, 63.2], [106.4, 44.1], [127.7, 36.2], [142.2, 36.2], [152.9, 34.2], [160.6, 26.5],
      [163.4, 15.7], [163.5, 3.8], [157.1, -6.1], [145.7, -10.7], [125.6, -10.8], [107, -10.8],
      [97, -13.4], [90.3, -21.3], [89.4, -31.5], [94.6, -40.5], [103.9, -45.1], [116.6, -49.8],
      [130.8, -58.9], [137.3, -74.4], [137.3, -88.3], [131.8, -100.5], [120.8, -108.1], [83.5, -124.4],
    ],
  },
  {
    id: 'contact', name: 'Contact', circuit: 'Monaco', scale: 3.38, clockwise: true,
    startIndex: 0,
    banners: ['contact', 'email', 'github', 'linkedin', 'say hello'],
    points: [
      [-101.8, 22.3], [-47.4, -72], [-39.4, -85.9], [-31, -93], [-20.2, -95.4], [61.2, -109.7],
      [97.7, -117.7], [111.1, -127.3], [120.3, -133], [131.2, -132.7], [139.9, -126.3], [144.3, -116.3],
      [146.2, -106.1], [142.5, -97], [133.8, -91.3], [123.3, -90.7], [112.8, -90.7], [102.7, -88.4],
      [95.8, -80.7], [94.6, -70.5], [99.6, -61.4], [108.8, -56.9], [119.2, -55.1], [129.8, -52.1],
      [137.3, -44.2], [142.3, -34.3], [141.9, -23.4], [136.8, -10.2], [109.9, 19.1], [71.5, 27.2],
      [32, 20.5], [20.2, 19.8], [9.4, 25.7], [-0.9, 32.7], [-12.6, 33.3], [-24.8, 31.2],
      [-37.1, 30], [-48.1, 35.5], [-54.9, 45.8], [-59.2, 56.9], [-56.9, 69], [-55.1, 81.2],
      [-60, 92.5], [-66.9, 102.2], [-78.1, 107.1], [-90.6, 107.4], [-101.3, 112.2], [-108.4, 122.4],
      [-117.1, 131], [-129.2, 133], [-139.8, 127.9], [-145.8, 117.2], [-146.2, 107.2], [-145.3, 97.9],
      [-140.7, 89.7],
    ],
  },
];

// ---------- helpers ----------

/** Wrap an angle to (-π, π]. */
export function wrapAngle(a) {
  a = (a + Math.PI) % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  return a - Math.PI;
}

/** Positive modulo. */
function mod(a, m) { a %= m; return a < 0 ? a + m : a; }

/** Shoelace area in (x, z); positive = clockwise as seen from above. */
function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % pts.length];
    a += x0 * z1 - x1 * z0;
  }
  return a / 2;
}

/**
 * Evaluate a closed centripetal Catmull-Rom spline through `pts` densely.
 * Returns a polyline (arrays of x, z) with the first point repeated at the
 * end so cumulative arc length closes.
 */
function denseSpline(pts, subdiv = 48) {
  const m = pts.length, xs = [], zs = [];
  const P = (k) => pts[mod(k, m)];
  for (let i = 0; i < m; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    // centripetal parameterisation: knot spacing = sqrt(chord)
    const t0 = 0;
    const t1 = t0 + Math.sqrt(Math.hypot(p1[0] - p0[0], p1[1] - p0[1])) || t0 + 1e-6;
    const t2 = t1 + Math.sqrt(Math.hypot(p2[0] - p1[0], p2[1] - p1[1])) || t1 + 1e-6;
    const t3 = t2 + Math.sqrt(Math.hypot(p3[0] - p2[0], p3[1] - p2[1])) || t2 + 1e-6;
    for (let j = 0; j < subdiv; j++) {
      const t = t1 + (t2 - t1) * (j / subdiv);
      // Barry–Goldman pyramid
      const A1x = ((t1 - t) * p0[0] + (t - t0) * p1[0]) / (t1 - t0), A1z = ((t1 - t) * p0[1] + (t - t0) * p1[1]) / (t1 - t0);
      const A2x = ((t2 - t) * p1[0] + (t - t1) * p2[0]) / (t2 - t1), A2z = ((t2 - t) * p1[1] + (t - t1) * p2[1]) / (t2 - t1);
      const A3x = ((t3 - t) * p2[0] + (t - t2) * p3[0]) / (t3 - t2), A3z = ((t3 - t) * p2[1] + (t - t2) * p3[1]) / (t3 - t2);
      const B1x = ((t2 - t) * A1x + (t - t0) * A2x) / (t2 - t0), B1z = ((t2 - t) * A1z + (t - t0) * A2z) / (t2 - t0);
      const B2x = ((t3 - t) * A2x + (t - t1) * A3x) / (t3 - t1), B2z = ((t3 - t) * A2z + (t - t1) * A3z) / (t3 - t1);
      xs.push(((t2 - t) * B1x + (t - t1) * B2x) / (t2 - t1));
      zs.push(((t2 - t) * B1z + (t - t1) * B2z) / (t2 - t1));
    }
  }
  xs.push(xs[0]); zs.push(zs[0]);
  return { xs, zs };
}

/** Resample a closed polyline into exactly n points at equal arc length. */
function resample(xs, zs, n) {
  const cum = [0];
  for (let i = 1; i < xs.length; i++) cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]));
  const L = cum[cum.length - 1], step = L / n;
  const x = new Float64Array(n), z = new Float64Array(n);
  let k = 0;
  for (let i = 0; i < n; i++) {
    const s = i * step;
    while (k < cum.length - 2 && cum[k + 1] < s) k++;
    const seg = cum[k + 1] - cum[k], f = seg > 0 ? (s - cum[k]) / seg : 0;
    x[i] = xs[k] + (xs[k + 1] - xs[k]) * f;
    z[i] = zs[k] + (zs[k + 1] - zs[k]) * f;
  }
  return { x, z, L };
}

/**
 * Build a Track from a definition (see TRACKS). Closed centripetal
 * Catmull-Rom through `def.points`, densely sampled, resampled at ds = 1 m,
 * tangents by central difference, curvature from the heading derivative
 * smoothed with a 5-sample box filter.
 * @param {object} def
 * @returns {object} Track
 */
export function buildTrack(def) {
  let pts = def.points.map((p) => [p[0], p[1]]);
  // start/finish at points[startIndex] → rotate so it is first
  const si = mod(def.startIndex || 0, pts.length);
  pts = pts.slice(si).concat(pts.slice(0, si));
  // make the direction of travel match `clockwise`
  if ((signedArea(pts) > 0) !== !!def.clockwise) {
    pts = [pts[0]].concat(pts.slice(1).reverse());
  }

  const dense = denseSpline(pts);
  // arc length → integer number of 1 m samples; scale coordinates so that
  // the spacing is exactly ds (a < 0.05 % change in size).
  let { x, z, L } = resample(dense.xs, dense.zs, Math.max(8, Math.round(
    (() => { let l = 0; for (let i = 1; i < dense.xs.length; i++) l += Math.hypot(dense.xs[i] - dense.xs[i - 1], dense.zs[i] - dense.zs[i - 1]); return l; })() / DS)));
  const n = x.length, length = n * DS, k = length / L;
  for (let i = 0; i < n; i++) { x[i] *= k; z[i] *= k; }

  const tx = new Float64Array(n), tz = new Float64Array(n), theta = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = (i + 1) % n, b = (i - 1 + n) % n;
    let dx = x[a] - x[b], dz = z[a] - z[b];
    const m = Math.hypot(dx, dz) || 1;
    tx[i] = dx / m; tz[i] = dz / m;
    theta[i] = Math.atan2(-tx[i], -tz[i]);
  }
  const raw = new Float64Array(n), curv = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = (i + 1) % n, b = (i - 1 + n) % n;
    raw[i] = wrapAngle(theta[a] - theta[b]) / (2 * DS);
  }
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = -2; j <= 2; j++) s += raw[(i + j + n) % n];
    curv[i] = s / 5;
  }

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < n; i++) {
    if (x[i] < minX) minX = x[i]; if (x[i] > maxX) maxX = x[i];
    if (z[i] < minZ) minZ = z[i]; if (z[i] > maxZ) maxZ = z[i];
  }

  // 20 m grid for global nearest-sample queries
  const cell = 20, gx0 = minX - cell, gz0 = minZ - cell;
  const gw = Math.ceil((maxX - gx0) / cell) + 2, gh = Math.ceil((maxZ - gz0) / cell) + 2;
  const grid = new Array(gw * gh);
  for (let i = 0; i < n; i++) {
    const cx = Math.floor((x[i] - gx0) / cell), cz = Math.floor((z[i] - gz0) / cell);
    const c = cz * gw + cx;
    (grid[c] || (grid[c] = [])).push(i);
  }

  const banners = (def.banners || []).map((text, j, arr) => ({
    s: Math.round(((j + 0.5) / arr.length) * length) % length,
    side: j % 2 === 0 ? 1 : -1,
    text,
  }));

  const track = {
    id: def.id, name: def.name, circuit: def.circuit, scale: def.scale, clockwise: !!def.clockwise,
    hw: HALF_WIDTH, length, n, ds: DS, x, z, tx, tz, theta, curv, banners, startS: 0,
    bounds: { minX, maxX, minZ, maxZ },

    /** Centreline pose at arc length s (wraps). */
    pose(s) {
      s = mod(s, length);
      const i0 = Math.floor(s / DS), i1 = (i0 + 1) % n, f = s / DS - i0;
      return {
        x: x[i0] + (x[i1] - x[i0]) * f,
        z: z[i0] + (z[i1] - z[i0]) * f,
        theta: theta[i0] + wrapAngle(theta[i1] - theta[i0]) * f,
      };
    },

    /** Signed curvature at arc length s (wraps, linear interpolation). */
    curvAt(s) {
      s = mod(s, length);
      const i0 = Math.floor(s / DS), i1 = (i0 + 1) % n, f = s / DS - i0;
      return curv[i0] + (curv[i1] - curv[i0]) * f;
    },

    /**
     * Nearest centreline sample to (px, pz). With a hint (previous i) the
     * search covers ±60 samples around it; otherwise the 20 m grid is used.
     * @returns {{i:number, s:number, d:number, psiRef:number}}
     */
    project(px, pz, hint) {
      let best = -1, bd = Infinity;
      const consider = (i) => {
        const dx = px - x[i], dz = pz - z[i], q = dx * dx + dz * dz;
        if (q < bd) { bd = q; best = i; }
      };
      if (hint !== undefined && hint !== null && hint >= 0) {
        for (let j = -60; j <= 60; j++) consider(mod(hint + j, n));
      } else {
        const cx = Math.floor((px - gx0) / cell), cz = Math.floor((pz - gz0) / cell);
        for (let r = 1; r < Math.max(gw, gh) + 1 && best < 0; r++) {
          for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
            const gx = cx + dx, gz = cz + dz;
            if (gx < 0 || gz < 0 || gx >= gw || gz >= gh) continue;
            const bucket = grid[gz * gw + gx];
            if (bucket) for (const i of bucket) consider(i);
          }
        }
        if (best < 0) for (let i = 0; i < n; i++) consider(i);
        // refine locally in case the grid ring missed a closer sample
        const b0 = best; for (let j = -40; j <= 40; j++) consider(mod(b0 + j, n));
      }
      const i = best;
      const dx = px - x[i], dz = pz - z[i];
      const along = dx * tx[i] + dz * tz[i];                // metres along the tangent
      const d = dx * Math.cos(theta[i]) + dz * -Math.sin(theta[i]); // + = right
      // snap a rounding-level along component (a purely lateral offset gives
      // ±1e-15) so a tiny negative value cannot wrap to s === length
      let a = Math.max(-DS, Math.min(DS, along));
      if (Math.abs(a) < 1e-9) a = 0;
      let s = i * DS + a;
      if (s < 0) s += length; else if (s >= length) s -= length;
      if (!(s < length) || s < 0) s = 0;                        // always 0 <= s < length
      return { i, s, d, psiRef: theta[i] };
    },
  };
  return track;
}

let cache = null;
/**
 * Build (once) and return all five tracks in section order.
 * @returns {object[]}
 */
export function allTracks() {
  if (!cache) cache = TRACKS.map(buildTrack);
  return cache;
}
