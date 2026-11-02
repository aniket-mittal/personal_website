// ============================================================
//  car.js — the procedural open-wheel car (three.js).
//
//  Lifted from the original main.js. Geometry and materials are the same;
//  only the livery is parametrised (body / accent / wings / fin / helmet /
//  rims) and an update() method animates wheels, steering, body roll and
//  the rain light. Forward is the car's local -z (DESIGN.md convention).
//
//  buildCar(livery) -> { group, chassis, wheels, rainLight, update }
// ============================================================
import * as THREE from 'three';

const WHEEL_R = 0.36;                         // tyre radius (m)
const MAX_STEER = Math.atan(0.09 * 3.6);      // CAR.maxKappa * CAR.wheelbase (DESIGN.md physics constants)
const clamp = THREE.MathUtils.clamp;

/** Carbon-weave bump texture from a 64 px canvas (repeat 8×30). Browser only. */
export function carbonTexture() {
  const s = 64, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  const cell = 16;
  for (let y = 0; y < s; y += cell) for (let x = 0; x < s; x += cell) {
    const horiz = ((x + y) / cell) % 2 === 0;
    for (let k = 0; k < cell; k++) {
      const shade = 110 + Math.round(60 * Math.sin((k / cell) * Math.PI));
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      if (horiz) ctx.fillRect(x, y + k, cell, 1); else ctx.fillRect(x + k, y, 1, cell);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 30);
  return t;
}

/**
 * Superellipse ring of `count` Vector2 points centred (cx, cy), half-sizes hw × hh.
 * nTop / nBot are the superellipse exponents for the upper and lower halves.
 */
export function superPts(cx, cy, hw, hh, nTop, nBot, count) {
  const pts = [];
  for (let j = 0; j < count; j++) {
    const a = (j / count) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), n = s >= 0 ? nTop : nBot;
    pts.push(new THREE.Vector2(cx + hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), cy + hh * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)));
  }
  return pts;
}

/**
 * Loft ring sections [{ z, pts: Vector2[], tag? }] into an indexed BufferGeometry.
 * Optional `colorOf(section, j, around)` returns a THREE.Color per vertex and adds a
 * `color` attribute (pair it with a material using `vertexColors: true`, base colour white).
 */
export function loft(sections, colorOf = null) {
  const around = sections[0].pts.length;
  const pos = [], uv = [], col = [], idx = [];
  sections.forEach((s, i) => {
    for (let j = 0; j <= around; j++) {
      const p = s.pts[j % around];
      pos.push(p.x, p.y, s.z); uv.push(j / around, i / (sections.length - 1));
      if (colorOf) { const c = colorOf(s, j, around); col.push(c.r, c.g, c.b); }
    }
  });
  for (let i = 0; i < sections.length - 1; i++) for (let j = 0; j < around; j++) {
    const a = i * (around + 1) + j, b = a + 1, c = a + around + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (colorOf) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** rows: [z, halfWidth, yBottom, yTop, cx = 0, tag?] -> sections for loft(). */
export const bodySections = (rows, nTop, nBot, around = 40) =>
  rows.map(([z, hw, yb, yt, cx = 0, tag]) => ({ z, tag, pts: superPts(cx, (yb + yt) / 2, hw, (yt - yb) / 2, nTop, nBot, around) }));

/** Inverted aerofoil profile (downforce). u along chord (+z), v up. */
export function foilShape(chord) {
  const s = new THREE.Shape();
  s.moveTo(0, 0.015 * chord);
  s.quadraticCurveTo(0.5 * chord, 0.17 * chord, chord, 0.3 * chord);
  s.lineTo(chord, 0.28 * chord);
  s.quadraticCurveTo(0.4 * chord, -0.05 * chord, 0, 0);
  s.closePath();
  return s;
}

/** A wing element: extruded foil of the given span/chord, pitched about x. Returns a Group. */
export function wingElement(span, chord, pitch, mat, thickness = 1) {
  const geo = new THREE.ExtrudeGeometry(foilShape(chord), { depth: span, bevelEnabled: false, curveSegments: 10 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.y = -Math.PI / 2; mesh.position.x = span / 2; mesh.scale.y = thickness;
  mesh.castShadow = true;
  const g = new THREE.Group(); g.rotation.x = pitch; g.add(mesh);
  return g;
}

/** A cylinder from a to b of radius r; `flat` squashes it in x (aero-profiled suspension arms). */
export function rod(a, b, r, mat, flat = 1) {
  const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.scale.x = flat; m.castShadow = true;
  return m;
}

/**
 * Build the car. Livery colours are hex numbers; `fin` toggles the shark fin.
 * Defaults are the black policy car. Player car: { body: 0xf3f1ea, accent: 0xc5302c,
 * wings: 0x1b1917, fin: false, helmet: 0xf3f1ea }.
 *
 * @returns {{ group: THREE.Group, chassis: THREE.Group,
 *   wheels: { pivot: THREE.Group, spin: THREE.Group, front: boolean }[],
 *   rainLight: THREE.Mesh,
 *   update: (a: { v?: number, steer?: number, accel?: number, latAcc?: number, dt?: number }) => void }}
 *   update(): v m/s spins the wheels; steer ∈ [-1, 1] (+ = left) turns the front wheels;
 *   accel m/s² pitches the chassis and blinks the rain light under braking (< -3);
 *   latAcc m/s² (signed, + = left turn, i.e. v²·κ) rolls the chassis; dt seconds.
 */
export function buildCar({ body = 0x07080a, accent = 0x07080a, wings = 0x0b0c0f, fin = true, helmet = 0x0d0e12, rimColor = 0x1a1b1f } = {}) {
  const carbonTex = carbonTexture();
  const bodyCol = new THREE.Color(body), accentCol = new THREE.Color(accent);
  const glossProps = { metalness: 0.55, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.07, bumpMap: carbonTex, bumpScale: 0.0012, side: THREE.DoubleSide, envMapIntensity: 1.3 };
  const gloss = new THREE.MeshPhysicalMaterial({ color: body, ...glossProps });
  // The same paint, coloured per vertex so the nose and the engine-cover stripe can take the accent.
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, ...glossProps });
  const matte = new THREE.MeshStandardMaterial({ color: wings, metalness: 0.35, roughness: 0.55, bumpMap: carbonTex, bumpScale: 0.002, side: THREE.DoubleSide, envMapIntensity: 0.8 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0e0e0f, roughness: 0.93, metalness: 0 });
  const rimMat = new THREE.MeshStandardMaterial({ color: rimColor, metalness: 0.95, roughness: 0.22 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x6a6e76, metalness: 1, roughness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 1, side: THREE.DoubleSide });
  const foam = new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.95 });
  const visor = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0c, metalness: 1, roughness: 0.04, clearcoat: 1 });
  const rainMat = new THREE.MeshStandardMaterial({ color: 0x2a0004, emissive: 0xff1020, emissiveIntensity: 1.2 });

  // Vertex colour rules: the nose cone (rows tagged 'nose') and a stripe along the top
  // centre of the engine cover (ring indices around the top, a = π/2 ↔ j = around/4).
  const noseOrBody = (sec) => (sec.tag === 'nose' ? accentCol : bodyCol);
  const stripe = (sec, j, around) => (Math.abs(j - around / 4) <= 2 ? accentCol : bodyCol);

  const car = new THREE.Group();
  const chassis = new THREE.Group();
  car.add(chassis);
  const add = (m, mat) => { if (mat) m.material = mat; m.castShadow = true; m.receiveShadow = false; chassis.add(m); return m; };

  // Monocoque + nose + tail (forward = -Z). The row at z = -1.85 is doubled so the
  // nose/body colour boundary is a crisp seam rather than a 45 cm gradient.
  add(new THREE.Mesh(loft(bodySections([
    [-2.86, 0.004, 0.23, 0.26, 0, 'nose'], [-2.78, 0.08, 0.19, 0.31, 0, 'nose'], [-2.3, 0.14, 0.15, 0.37, 0, 'nose'], [-1.85, 0.19, 0.12, 0.43, 0, 'nose'],
    [-1.85, 0.19, 0.12, 0.43],
    [-1.4, 0.26, 0.085, 0.51], [-0.9, 0.33, 0.065, 0.59], [-0.4, 0.36, 0.05, 0.655], [0.2, 0.36, 0.05, 0.675],
    [0.8, 0.32, 0.05, 0.655], [1.4, 0.26, 0.06, 0.58], [1.9, 0.18, 0.1, 0.48], [2.4, 0.11, 0.2, 0.4],
    [2.72, 0.05, 0.3, 0.36], [2.79, 0.004, 0.32, 0.34],
  ], 2.3, 3.6), noseOrBody), paint));
  // Airbox + engine cover (with the accent stripe along the spine)
  add(new THREE.Mesh(loft(bodySections([
    [0.04, 0.004, 0.7, 0.72], [0.16, 0.17, 0.7, 0.99], [0.5, 0.2, 0.66, 1.0], [1.0, 0.17, 0.6, 0.92],
    [1.5, 0.13, 0.52, 0.78], [2.0, 0.09, 0.44, 0.6], [2.5, 0.05, 0.36, 0.44], [2.7, 0.004, 0.35, 0.37],
  ], 2.2, 2.6), stripe), paint));
  // Airbox intake (dark)
  const intake = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(superPts(0, 0.86, 0.135, 0.095, 2.2, 2.2, 40))), dark);
  intake.position.z = 0.17; add(intake);
  // Shark fin (optional)
  if (fin) {
    const s = new THREE.Shape(); s.moveTo(0.85, 0.88); s.lineTo(2.45, 0.9); s.lineTo(2.45, 0.42); s.lineTo(0.85, 0.65); s.closePath();
    const finMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.016, bevelEnabled: false }), matte);
    finMesh.rotation.y = -Math.PI / 2; finMesh.position.x = 0.008; add(finMesh);
  }
  // Sidepods
  for (const sx of [-1, 1]) {
    const rows = [
      [-0.36, 0.3, 0.1, 0.56, 0.66 * sx], [0.1, 0.31, 0.06, 0.56, 0.68 * sx], [0.7, 0.27, 0.05, 0.5, 0.62 * sx],
      [1.3, 0.2, 0.05, 0.38, 0.52 * sx], [1.9, 0.11, 0.07, 0.22, 0.4 * sx], [2.2, 0.004, 0.1, 0.14, 0.34 * sx],
    ];
    add(new THREE.Mesh(loft(bodySections(rows, 2.4, 4)), gloss));
    const inlet = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(superPts(0.66 * sx, 0.33, 0.29, 0.22, 2.4, 4, 40))), dark);
    inlet.position.z = -0.355; add(inlet);
  }
  // Floor
  {
    const s = new THREE.Shape();
    [[-0.35, -1.05], [-1.0, -0.4], [-1.05, 1.2], [-0.7, 1.9], [-0.55, 2.35], [0.55, 2.35], [0.7, 1.9], [1.05, 1.2], [1.0, -0.4], [0.35, -1.05]]
      .forEach(([x, z], i) => (i ? s.lineTo(x, z) : s.moveTo(x, z)));
    const floor = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: false }), matte);
    floor.rotation.x = Math.PI / 2; floor.position.y = 0.05; add(floor);
  }
  // Diffuser
  {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.02, 0.86), matte);
    plate.position.set(0, 0.2, 2.2); plate.rotation.x = -0.4; add(plate);
    for (const x of [-0.5, -0.25, 0, 0.25, 0.5]) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.24, 0.86), matte);
      st.position.set(x, 0.31, 2.2); st.rotation.x = -0.4; add(st);
    }
  }
  // Front wing
  const fw = new THREE.Group(); chassis.add(fw);
  const fwEls = [[-3.08, 0.1, 1.9, 0.5, -0.1], [-2.86, 0.19, 1.9, 0.34, -0.32], [-2.72, 0.28, 1.72, 0.26, -0.5]];
  for (const [z, y, span, chord, pitch] of fwEls) { const e = wingElement(span, chord, pitch, matte); e.position.set(0, y, z); fw.add(e); }
  for (const sx of [-1, 1]) {
    const ep = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.33, 0.62), matte);
    ep.position.set(sx * 0.96, 0.27, -2.8); ep.rotation.z = sx * 0.08; ep.castShadow = true; fw.add(ep);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.5), matte); foot.position.set(sx * 1.0, 0.1, -2.84); fw.add(foot);
  }
  // Rear wing
  const rw = new THREE.Group(); chassis.add(rw);
  const rwMain = wingElement(1.02, 0.36, -0.22, matte); rwMain.position.set(0, 0.78, 2.28); rw.add(rwMain);
  const rwFlap = wingElement(1.02, 0.2, -0.95, matte); rwFlap.position.set(0, 0.98, 2.64); rw.add(rwFlap);
  const drs = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.22), matte); drs.position.set(0, 1.1, 2.58); drs.castShadow = true; rw.add(drs);
  const beam = wingElement(0.8, 0.2, -0.55, matte); beam.position.set(0, 0.44, 2.46); rw.add(beam);
  for (const sx of [-1, 1]) {
    const ep = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.56, 0.66), matte);
    ep.position.set(sx * 0.52, 0.9, 2.52); ep.castShadow = true; rw.add(ep);
    const sl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.66), new THREE.MeshStandardMaterial({ color: 0x9aa0aa, metalness: 1, roughness: 0.3 }));
    sl.position.set(sx * 0.52, 1.18, 2.52); rw.add(sl);
    rw.add(rod(new THREE.Vector3(sx * 0.12, 0.48, 2.25), new THREE.Vector3(sx * 0.12, 0.84, 2.42), 0.02, matte, 2.2));
  }
  // Rain light + exhaust
  const rainLight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.055, 0.03), rainMat); rainLight.position.set(0, 0.33, 2.8); chassis.add(rainLight);
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.22, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x8a8378, metalness: 1, roughness: 0.35, side: THREE.DoubleSide }));
  exhaust.rotation.x = Math.PI / 2 - 0.15; exhaust.position.set(0, 0.42, 2.74); chassis.add(exhaust);
  // Cockpit, headrest, helmet, halo
  const opening = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(superPts(0, 0, 0.3, 0.52, 2.5, 2.5, 40))), dark);
  opening.rotation.x = -Math.PI / 2; opening.position.set(0, 0.7, -0.1); chassis.add(opening);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.14), foam)).position.set(0, 0.73, 0.28);
  for (const sx of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.5), foam)).position.set(sx * 0.27, 0.73, 0.02);
  const helmetMesh = new THREE.Mesh(new THREE.SphereGeometry(0.145, 32, 24), new THREE.MeshPhysicalMaterial({ color: helmet, metalness: 0.3, roughness: 0.2, clearcoat: 1 }));
  helmetMesh.position.set(0, 0.76, -0.06); add(helmetMesh);
  const vis = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 16, Math.PI * 1.22, Math.PI * 0.56, Math.PI * 0.4, Math.PI * 0.22), visor);
  vis.position.copy(helmetMesh.position); add(vis);
  const haloG = new THREE.Group(); haloG.position.set(0, 0.86, -0.02); haloG.rotation.x = -0.1; chassis.add(haloG);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 14, 64), gloss); halo.rotation.x = Math.PI / 2; halo.scale.y = 1.3; halo.castShadow = true; haloG.add(halo);
  chassis.add(rod(new THREE.Vector3(0, 0.6, -0.62), new THREE.Vector3(0, 0.84, -0.54), 0.025, gloss, 1.6));
  for (const sx of [-1, 1]) chassis.add(rod(new THREE.Vector3(sx * 0.36, 0.68, 0.46), new THREE.Vector3(sx * 0.38, 0.84, 0.34), 0.022, gloss));
  // Mirrors, T-cam
  for (const sx of [-1, 1]) {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.075, 0.07), gloss)).position.set(sx * 0.58, 0.61, -0.6);
    chassis.add(rod(new THREE.Vector3(sx * 0.36, 0.56, -0.6), new THREE.Vector3(sx * 0.52, 0.6, -0.6), 0.012, matte));
  }
  add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.3), matte)).position.set(0, 1.05, 0.4);

  // Suspension + wheels
  const wheels = [];
  const axles = [{ z: -1.8, x: 0.8, w: 0.305, front: true }, { z: 1.8, x: 0.78, w: 0.405, front: false }];
  for (const ax of axles) for (const sx of [-1, 1]) {
    const hubX = sx * (ax.x - ax.w / 2 - 0.02), bx = sx * (ax.front ? 0.2 : 0.17);
    const vec = (x, y, z) => new THREE.Vector3(x, y, z);
    chassis.add(rod(vec(bx, 0.46, ax.z - 0.22), vec(hubX, 0.46, ax.z - 0.03), 0.011, matte, 1.9));
    chassis.add(rod(vec(bx, 0.46, ax.z + 0.22), vec(hubX, 0.46, ax.z + 0.03), 0.011, matte, 1.9));
    chassis.add(rod(vec(bx, 0.17, ax.z - 0.22), vec(hubX, 0.2, ax.z - 0.03), 0.011, matte, 1.9));
    chassis.add(rod(vec(bx, 0.17, ax.z + 0.22), vec(hubX, 0.2, ax.z + 0.03), 0.011, matte, 1.9));
    chassis.add(rod(vec(hubX, 0.2, ax.z - 0.05), vec(bx, ax.front ? 0.52 : 0.5, ax.z + (ax.front ? 0.05 : -0.05)), 0.011, matte, 1.8));
    if (!ax.front) chassis.add(rod(vec(bx, 0.26, ax.z + 0.05), vec(hubX, 0.3, ax.z + 0.08), 0.02, metal));

    const pivot = new THREE.Group(); pivot.position.set(sx * ax.x, 0.36, ax.z); car.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, ax.w, 64, 1), tireMat); tire.rotation.z = Math.PI / 2; tire.castShadow = true; spin.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, ax.w * 0.94, 48), rimMat); rim.rotation.z = Math.PI / 2; spin.add(rim);
    const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.012, 48), rimMat); cover.rotation.z = Math.PI / 2; cover.position.x = sx * (ax.w / 2 + 0.004); spin.add(cover);
    const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 6), metal); nut.rotation.z = Math.PI / 2; nut.position.x = sx * (ax.w / 2 + 0.02); spin.add(nut);
    const duct = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.3), matte); duct.position.x = -sx * (ax.w / 2 - 0.02); pivot.add(duct);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 32), new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.8, roughness: 0.5 })); disc.rotation.z = Math.PI / 2; disc.position.x = -sx * (ax.w / 2 - 0.06); pivot.add(disc);
    wheels.push({ pivot, spin, front: ax.front });
  }

  // ---- animation -------------------------------------------------------
  const anim = { wheelAngle: 0, t: 0 };
  function update({ v = 0, steer = 0, accel = 0, latAcc = 0, dt = 1 / 60 } = {}) {
    anim.t += dt;
    // rolling forward (−z) means the top of the tyre moves toward −z: negative rotation about x
    anim.wheelAngle -= (v / WHEEL_R) * dt;
    const target = clamp(steer, -1, 1) * MAX_STEER;        // + steer = left = +rotation.y
    for (const w of wheels) {
      w.spin.rotation.x = anim.wheelAngle;
      if (w.front) w.pivot.rotation.y += (target - w.pivot.rotation.y) * Math.min(1, 8 * dt);
    }
    const k = Math.min(1, 5 * dt);
    chassis.rotation.x += (clamp(accel * 0.0016, -0.03, 0.03) - chassis.rotation.x) * k;      // squat / dive
    chassis.rotation.z += (clamp(-latAcc * 0.002, -0.035, 0.035) - chassis.rotation.z) * k;  // roll to the outside
    rainMat.emissiveIntensity = accel < -3 ? (Math.floor(anim.t / 0.12) % 2 ? 5 : 0.5) : 1.2;
  }

  return { group: car, chassis, wheels, rainLight, update };
}
