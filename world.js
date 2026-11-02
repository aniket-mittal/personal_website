// ============================================================
//  world.js — the circuit scene (three.js): grass, asphalt ribbon, edge
//  lines, kerbs, barriers, start line, banners; day lighting; minimap.
//
//  Geometry follows the Track interface in DESIGN.md: centreline samples
//  x/z with unit tangents tx/tz at 1 m spacing. With heading θ,
//  forward = (−sin θ, 0, −cos θ) = (tx, 0, tz) and right = (cos θ, 0, −sin θ),
//  so the right-hand normal in xz is (−tz, tx). Lateral offsets > 0 are to the right.
//
//  DEVIATIONS FROM DESIGN.md
//  * Barriers sit at ±(hw + 6) everywhere except on the inside of corners
//    tighter than R ≈ 16 m (|curv| > 0.061), where an 11.5 m offset exceeds the
//    local radius and the ribbon would fold over itself. There the inside barrier
//    is pulled in just enough (offset ≤ 0.7/|curv|, never under hw + 2.3) and
//    smoothed over ±6 m. Cosmetic only: physics never touches the barriers.
//  * addLighting(scene, renderer?) takes an optional renderer; when given it also
//    sets scene.environment (PMREM RoomEnvironment, intensity 0.7) as the old
//    main.js did, since the car's clearcoat paint needs it. Returns { sun, hemi }.
// ============================================================
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Page theme, read from the CSS custom properties on :root so the strip always matches the page.
 * Falls back to the original editorial palette when there is no document (tests).
 */
export function theme() {
  const d = { paper: '#f6f4ee', ink: '#1b1917', muted: '#7d786e', serif: 'Newsreader, "Iowan Old Style", Georgia, serif', mono: '"IBM Plex Mono", "SF Mono", Menlo, monospace' };
  try {
    const cs = getComputedStyle(document.documentElement);
    for (const k of Object.keys(d)) { const v = cs.getPropertyValue(`--${k}`).trim(); if (v) d[k] = v; }
  } catch (e) { /* no DOM */ }
  return d;
}
const hex = (css) => parseInt(css.replace('#', ''), 16);
/** Light blend of a hex CSS colour towards white, as a CSS string (for the banner cards). */
const lighten = (css, t) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(css.slice(i, i + 2), 16) * (1 - t) + 255 * t).toString(16).padStart(2, '0')).join('');
const T = theme();
const PAPER = hex(T.paper);
const INK = T.ink;
const SERIF = T.serif;
const CARD_CSS = lighten(T.paper, 0.25), CARD = hex(CARD_CSS), BOARD_INK = T.muted;

// ---- helpers ---------------------------------------------------------------

function noiseTexture(size, base, spread, repeat) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = base + (Math.random() - 0.5) * spread;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;   // three clamps this to the device maximum
  return t;
}

/** Sample index for arc length s (wraps). */
function idxAt(track, s) {
  const n = track.n, i = Math.round(s / track.ds);
  return ((i % n) + n) % n;
}
/** Heading at sample i from the tangent (θ with forward = (−sin θ, −cos θ)). */
function headingAt(track, i) { return Math.atan2(-track.tx[i], -track.tz[i]); }

/**
 * A ribbon that follows the whole closed centreline.
 * Flat (height 0): `width` metres wide, centred `offset` metres to the right.
 * Vertical (height > 0): a wall `height` tall standing at `offset`.
 * `offsetFn(i)` overrides `offset` per sample, `include(i)` masks segments,
 * uv.v = s / uvScale. Rows are [left/bottom, right/top]; winding gives +y normals.
 */
function ribbon(track, { offset = 0, offsetFn = null, width = 1, y = 0, height = 0, include = null, uvScale = 6, material }) {
  const n = track.n, pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const k = i % n, s = i * track.ds;
    const rx = -track.tz[k], rz = track.tx[k];              // right-hand normal
    const o = offsetFn ? offsetFn(k) : offset;
    const cx = track.x[k] + rx * o, cz = track.z[k] + rz * o;
    if (height > 0) pos.push(cx, y, cz, cx, y + height, cz);
    else pos.push(cx - rx * width / 2, y, cz - rz * width / 2, cx + rx * width / 2, y, cz + rz * width / 2);
    uv.push(0, s / uvScale, 1, s / uvScale);
    if (i < n && (!include || include(k))) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, material); m.receiveShadow = true;
  return m;
}

/** 1×2 red/white stripe texture; with uv.v = s/6 it gives 3 m stripes. */
function kerbTexture() {
  const data = new Uint8Array([197, 48, 44, 255, 244, 242, 236, 255]);
  const t = new THREE.DataTexture(data, 1, 2);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

/** Checkered start/finish texture: `cols` × 2 squares. */
function checkerTexture(cols = 20) {
  const sq = 16, c = document.createElement('canvas'); c.width = cols * sq; c.height = 2 * sq;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f2f2ee'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#2a2826';
  for (let r = 0; r < 2; r++) for (let q = 0; q < cols; q++) if ((q + r) % 2 === 0) ctx.fillRect(q * sq, r * sq, sq, sq);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/**
 * Pale card with muted serif text, drawn on a canvas. Returns the texture and a
 * `redraw()` to call once web fonts have loaded.
 */
function textTexture(text, { aspect = 4 / 0.9, px = 128, italic = true, weight = 400 } = {}) {
  const c = document.createElement('canvas'); c.width = Math.round(px * aspect); c.height = px;
  const ctx = c.getContext('2d');
  const draw = () => {
    ctx.fillStyle = CARD_CSS; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = 'rgba(125,120,110,0.35)'; ctx.lineWidth = Math.max(1, px * 0.012);
    ctx.strokeRect(px * 0.07, px * 0.07, c.width - px * 0.14, c.height - px * 0.14);
    let size = px * 0.46;
    const fontFor = (sz) => `${italic ? 'italic ' : ''}${weight} ${sz}px ${SERIF}`;
    ctx.font = fontFor(size);
    const maxW = c.width - px * 0.4, w = ctx.measureText(text).width;
    if (w > maxW) { size *= maxW / w; ctx.font = fontFor(size); }
    ctx.fillStyle = BOARD_INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, c.width / 2, c.height / 2 + size * 0.05);
  };
  draw();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  return { tex, redraw: () => { draw(); tex.needsUpdate = true; } };
}

/**
 * A board beside the road at arc length s, on `side` (−1 left, +1 right), facing the
 * road, standing `clearance` metres outside the road edge. w × h metres, bottom edge
 * at `lift`, on one or two thin posts.
 */
function makeBoard(track, { s, side, text, w = 4, h = 0.9, lift = 1.4, clearance = 2.5, posts = 2, italic = true }, shared) {
  const i = idxAt(track, s);
  const rx = -track.tz[i], rz = track.tx[i], theta = headingAt(track, i);
  const o = side * (track.hw + clearance);
  const g = new THREE.Group();
  g.position.set(track.x[i] + rx * o, 0, track.z[i] + rz * o);
  g.rotation.y = theta - side * Math.PI / 2;         // local +z points back at the road
  const { tex, redraw } = textTexture(text, { aspect: w / h, italic });
  shared.redraws.push(redraw);
  const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), [shared.card, shared.card, shared.card, shared.card, front, shared.card]);
  board.position.set(0, lift + h / 2, 0); board.castShadow = true; board.receiveShadow = true; g.add(board);
  const top = lift + h * 0.8, xs = posts === 1 ? [0] : [-(w / 2 - 0.3), w / 2 - 0.3];
  for (const x of xs) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, top, 8), shared.post);
    post.position.set(x, top / 2, -0.04); post.castShadow = true; g.add(post);
  }
  return g;
}

/**
 * Entries of the biggest stops: a corner (|curv| ≥ 0.03) after the longest
 * low-curvature runs. Returns [{ i, side }] (side = outside of the corner).
 */
function brakingZones(track, count = 3, minStraight = 120) {
  const n = track.n, c = track.curv, zones = [];
  for (let i = 0; i < n; i++) {
    const a = Math.abs(c[i]), b = Math.abs(c[(i - 1 + n) % n]);
    if (a < 0.03 || b >= 0.03) continue;
    let r = 1; while (r < 120 && Math.abs(c[(i - r + n) % n]) >= 0.02) r++;   // short entry ramp
    if (r >= 120) continue;
    let L = 0; while (L < n && Math.abs(c[(i - r - L + n) % n]) < 0.02) L++;
    let peak = 0, sign = 0;
    for (let k = 0; k < 40; k++) { const v = c[(i + k) % n]; if (Math.abs(v) > peak) { peak = Math.abs(v); sign = Math.sign(v); } }
    if (L >= minStraight && peak >= 0.04) zones.push({ i, L, side: sign || 1 });
  }
  zones.sort((p, q) => q.L - p.L);
  const out = [];
  for (const z of zones) {
    if (out.length >= count) break;
    if (out.every((o) => Math.min(Math.abs(o.i - z.i), n - Math.abs(o.i - z.i)) > 150)) out.push(z);
  }
  return out;
}

// ---- scene -----------------------------------------------------------------

/**
 * Build everything static for one circuit. Call once per track and keep the result;
 * `dispose()` removes the group from its parent and frees geometries, materials and textures.
 * @param {object} track  Track per DESIGN.md (x, z, tx, tz, curv, hw, n, ds, startS, banners, bounds)
 * @returns {{ group: THREE.Group, dispose: () => void }}
 */
export function buildTrackScene(track) {
  const group = new THREE.Group();
  group.name = `track:${track.id ?? ''}`;
  const hw = track.hw, n = track.n, ds = track.ds;
  const b = track.bounds || { minX: -260, maxX: 260, minZ: -260, maxZ: 260 };

  // Grass: one big plane, pale with a whisper of noise, centred on the circuit.
  const span = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) + 1000;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(span, span), new THREE.MeshStandardMaterial({ color: 0xd4d7c9, map: noiseTexture(256, 205, 44, Math.round(span / 4.4)), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((b.minX + b.maxX) / 2, -0.02, (b.minZ + b.maxZ) / 2);
  ground.receiveShadow = true; group.add(ground);

  // Asphalt
  const asphaltTex = noiseTexture(256, 160, 50, 1); asphaltTex.repeat.set(3, 1);
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x80838a, map: asphaltTex, roughness: 0.95, side: THREE.DoubleSide });
  group.add(ribbon(track, { width: hw * 2, y: 0, material: roadMat }));

  // Edge lines
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.8, side: THREE.DoubleSide });
  for (const sd of [-1, 1]) group.add(ribbon(track, { offset: sd * (hw - 0.3), width: 0.2, y: 0.012, material: lineMat }));

  // Kerbs on corners (both sides), red/white every 3 m
  const kerbMat = new THREE.MeshStandardMaterial({ map: kerbTexture(), roughness: 0.7, side: THREE.DoubleSide });
  const isCorner = (i) => {
    for (let d = -8; d <= 8; d += 4) if (Math.abs(track.curv[(((i + d) % n) + n) % n]) > 0.012) return true;
    return false;
  };
  for (const sd of [-1, 1]) group.add(ribbon(track, { offset: sd * (hw + 0.6), width: 1.2, y: 0.015, include: isCorner, material: kerbMat }));

  // Barriers: 1 m walls at ±(hw + 6), pulled in on the inside of the tightest corners
  // so the offset curve never folds (see DEVIATIONS above), then smoothed ±6 m.
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xc4c4bf, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
  for (const sd of [-1, 1]) {
    const raw = new Float64Array(n), off = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const c = track.curv[i];
      let D = hw + 6;
      if (sd * c < 0) D = Math.min(D, 0.7 / Math.abs(c));      // inside of the corner
      raw[i] = Math.max(D, hw + 2.3);
    }
    for (let i = 0; i < n; i++) { let a = 0; for (let d = -6; d <= 6; d++) a += raw[(((i + d) % n) + n) % n]; off[i] = sd * a / 13; }
    const wall = ribbon(track, { offsetFn: (i) => off[i], height: 1.0, uvScale: 4, material: wallMat });
    wall.castShadow = true; group.add(wall);
  }

  // Start / finish line
  {
    const i = idxAt(track, track.startS || 0);
    const holder = new THREE.Group();
    holder.position.set(track.x[i], 0.013, track.z[i]); holder.rotation.y = headingAt(track, i);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2 - 0.8, 1.2), new THREE.MeshStandardMaterial({ map: checkerTexture(20), roughness: 0.85 }));
    line.rotation.x = -Math.PI / 2; line.receiveShadow = true; holder.add(line);
    group.add(holder);
  }

  // Banners and braking boards
  const shared = {
    card: new THREE.MeshStandardMaterial({ color: CARD, roughness: 0.9 }),
    post: new THREE.MeshStandardMaterial({ color: 0x9a968c, roughness: 0.7, metalness: 0.2 }),
    redraws: [],
  };
  for (const bn of track.banners || []) group.add(makeBoard(track, { s: bn.s, side: bn.side, text: bn.text }, shared));
  for (const z of brakingZones(track)) {
    for (const [dist, text] of [[100, '100'], [50, '50']]) {
      const s = (((z.i - dist) * ds) % track.length + track.length) % track.length;
      group.add(makeBoard(track, { s, side: z.side, text, w: 1.1, h: 0.8, lift: 0.9, clearance: 2.5, posts: 1, italic: false }, shared));
    }
  }

  // Redraw the boards once the serif has arrived (canvas text falls back until then).
  let disposed = false;
  try {
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { if (!disposed) for (const r of shared.redraws) r(); }).catch(() => {});
    }
  } catch (e) { /* no FontFaceSet: the fallback serif is fine */ }

  function dispose() {
    disposed = true;
    if (group.parent) group.parent.remove(group);
    const seen = new Set();
    group.traverse((o) => {
      if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        if (seen.has(m)) continue; seen.add(m);
        for (const key of ['map', 'bumpMap']) if (m[key] && !seen.has(m[key])) { seen.add(m[key]); m[key].dispose(); }
        m.dispose();
      }
    });
  }
  return { group, dispose };
}

/**
 * Day lighting: paper background + FogExp2 (0.0045), hemisphere light and a shadowed
 * sun. Move `sun.position` / `sun.target.position` to follow the focus car
 * (call `sun.target.updateMatrixWorld()` after). With a renderer, also sets a
 * RoomEnvironment PMREM as scene.environment (the car paint relies on it).
 * @returns {{ sun: THREE.DirectionalLight, hemi: THREE.HemisphereLight }}
 */
export function addLighting(scene, renderer = null) {
  scene.background = new THREE.Color(PAPER);
  scene.fog = new THREE.FogExp2(PAPER, 0.0045);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8e8c84, 1.0);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 160;
  sun.shadow.camera.left = -30; sun.shadow.camera.right = 30; sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  sun.position.set(30, 60, 20);
  scene.add(hemi, sun, sun.target);
  if (renderer) {
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.7;
      pmrem.dispose();
    } catch (e) { /* no environment: lights alone still work */ }
  }
  return { sun, hemi };
}

/**
 * Minimap: 1 px ink centreline fitted to w × h (8 px padding, aspect kept, seen from
 * above with +x right and +z down), a 2 px tick at the start line, a filled circle per car.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number, z:number, color:string, r?:number}[]} cars
 */
export function drawMinimap(ctx, track, cars, w, h) {
  ctx.clearRect(0, 0, w, h);
  const b = track.bounds, pad = 8;
  const bw = Math.max(1e-6, b.maxX - b.minX), bh = Math.max(1e-6, b.maxZ - b.minZ);
  const sc = Math.min((w - 2 * pad) / bw, (h - 2 * pad) / bh);
  const ox = (w - bw * sc) / 2, oz = (h - bh * sc) / 2;
  const X = (x) => ox + (x - b.minX) * sc, Z = (z) => oz + (z - b.minZ) * sc;

  // the centreline and start tick never change between frames: draw them once
  // per (track, size) into an offscreen canvas and blit it; only the cars are
  // drawn per frame. Falls back to drawing directly if no canvas can be made.
  const key = `${track.id}|${w}x${h}`;
  let layer = minimapCache.get(key);
  if (layer === undefined) {
    layer = makeMinimapLayer(track, w, h, X, Z);
    minimapCache.set(key, layer);
  }
  if (layer) ctx.drawImage(layer, 0, 0);
  else drawMinimapStatic(ctx, track, X, Z);

  for (const c of cars || []) {
    ctx.fillStyle = c.color || INK;
    ctx.beginPath(); ctx.arc(X(c.x), Z(c.z), c.r ?? 3, 0, Math.PI * 2); ctx.fill();
  }
}

/** Static minimap layers keyed by `${track.id}|${w}x${h}` (null = could not create a canvas). */
const minimapCache = new Map();

/** Stroke the centreline (1 px) and the start tick (2 px) with the given fit. */
function drawMinimapStatic(ctx, track, X, Z) {
  ctx.lineWidth = 1; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
  ctx.beginPath();
  const step = track.n > 600 ? 2 : 1;
  for (let i = 0; i < track.n; i += step) { const px = X(track.x[i]), pz = Z(track.z[i]); i ? ctx.lineTo(px, pz) : ctx.moveTo(px, pz); }
  ctx.closePath(); ctx.stroke();

  const i0 = idxAt(track, track.startS || 0);
  const rx = -track.tz[i0], rz = track.tx[i0], t = 4;
  ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(X(track.x[i0]) - rx * t, Z(track.z[i0]) - rz * t);
  ctx.lineTo(X(track.x[i0]) + rx * t, Z(track.z[i0]) + rz * t);
  ctx.stroke();
}

/** Render the static layer into an offscreen canvas of w × h, or null if that is impossible. */
function makeMinimapLayer(track, w, h, X, Z) {
  try {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const cx = c.getContext('2d');
    if (!cx) return null;
    drawMinimapStatic(cx, track, X, Z);
    return c;
  } catch (e) { return null; }
}
