// ============================================================
//  physics.js — kinematic bicycle car, speed controller and the
//  pure-pursuit "expert" steering used as the DAgger teacher.
//
//  Pure JS (no three.js). Units: metres, seconds, radians. See
//  docs/DESIGN.md. Heading θ: forward = (−sin θ, −cos θ); positive
//  curvature / positive steer = left turn (θ increases). Lateral offset
//  d is positive to the right of the direction of travel.
//
//  DEVIATIONS FROM DESIGN.md
//  * state carries one extra field, `pendingRecross` (bool): set when the
//    car crosses the start line backwards (lap -= 1), cleared by the next
//    forward crossing, which then restores the lap without emitting a lap
//    time. Lap counting is therefore net, so reversing over the line and
//    driving back cannot bank a lap.
// ============================================================

/** Car parameters shared by the simulation, the expert and the policy. */
export const CAR = {
  wheelbase: 3.6, maxSpeed: 58, accel: 16, brake: 30, drag: 0.0042,
  maxKappa: 0.09, steerRate: 0.35 /* 1/m per s */, aLatMax: 34,
  grassMaxSpeed: 22, grassDrag: 0.09, offTrackMargin: 1.6 /* |d| > hw + margin = off */,
};

// autoSpeed tuning (internal): the expert's pure pursuit needs some spare
// lateral grip to correct its own tracking error, so corner speeds are
// planned with a fraction of aLatMax and of the brake, and against the
// strongest curvature in a short window rather than a single sample.
const SPEED = { gripFrac: 0.85, brakeFrac: 0.82, band: 2.5, window: 6, rolling: 0.4 };

function wrapAngle(a) {
  a = (a + Math.PI) % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  return a - Math.PI;
}
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Fresh car state on the centreline at arc length s, offset dOffset metres
 * to the right, at rest and aligned with the road.
 * @param {object} track
 * @param {number} [s]
 * @param {number} [dOffset]
 */
export function makeCarState(track, s = track.startS, dOffset = 0) {
  const state = {
    x: 0, z: 0, theta: 0, v: 0, kappa: 0, s: 0, d: 0, psi: 0, i: 0, off: false,
    lap: 0, lapStartT: 0, lastLapTime: 0, distance: 0, t: 0,
    pendingRecross: false,   // crossed the line backwards; the next forward crossing is not a lap
  };
  resetToStart(state, track, dOffset);
  return state;
}

/**
 * Put an existing state back on the start line: speed, steering, lap,
 * distance and the lap timer are reset; the sim clock `t` keeps running.
 * @param {object} state
 * @param {object} track
 * @param {number} [dOffset]
 */
export function resetToStart(state, track, dOffset = 0) {
  const p = track.pose(track.startS);
  const rx = Math.cos(p.theta), rz = -Math.sin(p.theta);
  state.x = p.x + rx * dOffset; state.z = p.z + rz * dOffset;
  state.theta = p.theta; state.v = 0; state.kappa = 0;
  const pr = track.project(state.x, state.z, undefined);
  state.i = pr.i; state.s = pr.s; state.d = pr.d; state.psi = wrapAngle(state.theta - pr.psiRef);
  state.off = false; state.lap = 0; state.lapStartT = state.t; state.lastLapTime = 0; state.distance = 0;
  state.pendingRecross = false;
  return state;
}

/**
 * Advance the car by dt with input { throttle 0..1, brake 0..1, steer −1..1 }.
 * Steer maps to a target curvature steer*maxKappa, slewed at steerRate.
 * Lateral acceleration v²|κ| is limited to aLatMax by scaling the curvature
 * actually followed (understeer), never by crashing.
 * @param {object} state
 * @param {{throttle:number, brake:number, steer:number}} input
 * @param {number} dt
 * @param {object} track
 */
export function stepCar(state, input, dt, track) {
  const C = CAR, hw = track.hw;
  const throttle = clamp(input.throttle || 0, 0, 1), brakeIn = clamp(input.brake || 0, 0, 1);
  const steer = clamp(input.steer || 0, -1, 1);

  // steering slew
  const target = steer * C.maxKappa, maxStep = C.steerRate * dt;
  state.kappa += clamp(target - state.kappa, -maxStep, maxStep);

  // longitudinal
  const onGrass = Math.abs(state.d) > hw;
  let v = state.v;
  let a = C.accel * (1 - v / C.maxSpeed) * throttle - C.brake * brakeIn - C.drag * v * v - SPEED.rolling;
  if (onGrass) a -= C.grassDrag * v;
  v = Math.max(0, v + a * dt);
  if (onGrass && v > C.grassMaxSpeed) v = Math.max(C.grassMaxSpeed, v - 3 * C.grassDrag * v * dt);
  state.v = v;

  // lateral grip limit → curvature actually followed
  let k = state.kappa;
  const aLat = v * v * Math.abs(k);
  if (aLat > C.aLatMax) k *= C.aLatMax / aLat;

  // kinematic bicycle (curvature form)
  const ds = v * dt;
  const dTheta = k * ds;
  const thMid = state.theta + 0.5 * dTheta;
  state.x += -Math.sin(thMid) * ds;
  state.z += -Math.cos(thMid) * ds;
  state.theta = wrapAngle(state.theta + dTheta);

  // track-relative quantities
  const pr = track.project(state.x, state.z, state.i);
  const prevS = state.s;
  state.i = pr.i; state.s = pr.s; state.d = pr.d;
  state.psi = wrapAngle(state.theta - pr.psiRef);
  state.distance += ds;
  state.t += dt;
  state.off = Math.abs(state.d) > hw + C.offTrackMargin;

  // lap counting is net: a forward wrap past startS (= 0) adds a lap, a
  // backward wrap (reversing over the line) takes one away, so re-crossing
  // forward afterwards only restores it and does not emit a lap time.
  if (ds > 0 && prevS < track.length) {
    if (prevS - state.s > track.length * 0.5) {
      state.lap += 1;
      if (state.pendingRecross) state.pendingRecross = false;
      else { state.lastLapTime = state.t - state.lapStartT; state.lapStartT = state.t; }
    } else if (state.s - prevS > track.length * 0.5) {
      state.lap -= 1;
      state.pendingRecross = true;
    }
  }
  return state;
}

/**
 * Throttle/brake from the curvature ahead. For each sample up to
 * `lookahead` metres, the speed allowed there is sqrt(aLat/|κ|); the
 * speed allowed *now* is what still lets the car brake down to it
 * (v² − vAllowed² ≤ 2·brake·dist). Bang-bang with a proportional band.
 * @param {object} track
 * @param {object} state
 * @param {number} [lookahead]
 * @returns {{throttle:number, brake:number}}
 */
export function autoSpeed(track, state, lookahead = 90) {
  const C = CAR, aLat = C.aLatMax * SPEED.gripFrac, brk = C.brake * SPEED.brakeFrac;
  let vTarget = C.maxSpeed;
  for (let k = 0; k <= lookahead; k += 1) {
    // strongest curvature in a short window around s + k (robust to the
    // 1 m sampling and to the car cutting the apex)
    let kk = 0;
    for (let w = 0; w <= SPEED.window; w += 2) kk = Math.max(kk, Math.abs(track.curvAt(state.s + k + w)));
    const vAllowed = Math.sqrt(aLat / Math.max(kk, 1e-4));
    const vNow = Math.sqrt(vAllowed * vAllowed + 2 * brk * k);
    if (vNow < vTarget) vTarget = vNow;
  }
  vTarget = Math.min(vTarget, C.maxSpeed);
  const err = vTarget - state.v;
  if (err >= 0) return { throttle: clamp(err / SPEED.band, 0.15, 1), brake: 0 };
  return { throttle: 0, brake: clamp(-err / SPEED.band, 0, 1) };
}

/**
 * Pure pursuit on the centreline: look L = clamp(0.55·v + 5, 7, 26) m
 * ahead in arc length, aim at that point, κ = 2 sin(α)/L.
 * @param {object} track
 * @param {object} state
 * @returns {number} steer in [−1, 1]
 */
export function expertSteer(track, state) {
  const L = clamp(0.55 * state.v + 5, 7, 26);
  const p = track.pose(state.s + L);
  const dx = p.x - state.x, dz = p.z - state.z;
  const fx = -Math.sin(state.theta), fz = -Math.cos(state.theta);
  const rx = Math.cos(state.theta), rz = -Math.sin(state.theta);
  const fwd = dx * fx + dz * fz, lat = dx * rx + dz * rz; // lat > 0 → target on the right
  const alpha = Math.atan2(-lat, fwd);                      // > 0 → turn left
  const dist = Math.max(1, Math.hypot(dx, dz));
  const kappa = (2 * Math.sin(alpha)) / dist;
  return clamp(kappa / CAR.maxKappa, -1, 1);
}
