// ============================================================
//  policy.js — a tiny MLP steering policy trained live by DAgger.
//
//  Pure JS (no three.js, no dependencies). The policy maps 10 features of
//  the car's situation to a steer command in [−1, 1]. It is trained by
//  on-policy imitation: the car drives with the policy, and every metre we
//  record (features, expert steer) so the network learns what the expert
//  would have done *in the states the policy actually visits*.
//  See docs/DESIGN.md.
//
//  DEVIATIONS FROM DESIGN.md
//  * Trainer defaults are lr = 1e-3, batch = 64, initScale = 2.2 (the
//    contract lists initScale = 1.8). Tuned in tests/policy.test.mjs:
//    with 1.8 the car laps on attempt 1 for most seeds, so nobody sees it
//    learn; 2.2 gives a median of 2–3.5 attempts with 10/10 seeds lapping
//    within 7 on every circuit (target: 8/10 within 10, median ≤ 6).
// ============================================================

import { CAR, expertSteer } from './physics.js';

export const N_FEATURES = 10;
const LOOK = [6, 12, 22, 36, 55, 80];

/**
 * Feature vector of a car state on a track.
 * [ d/hw, psi/0.7, kappa/maxKappa, v/maxSpeed, curvAt(s+6..80)/maxKappa ×6 ]
 * @param {object} track
 * @param {object} state
 * @param {Float64Array} out length N_FEATURES
 * @returns {Float64Array} out
 */
export function features(track, state, out) {
  out[0] = state.d / track.hw;
  out[1] = state.psi / 0.7;
  out[2] = state.kappa / CAR.maxKappa;
  out[3] = state.v / CAR.maxSpeed;
  for (let j = 0; j < LOOK.length; j++) out[4 + j] = track.curvAt(state.s + LOOK[j]) / CAR.maxKappa;
  return out;
}

/**
 * mulberry32: a small seedable PRNG returning uniform numbers in [0, 1).
 * @param {number} seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ---------- dense layer with Adam ----------
class Dense {
  constructor(nIn, nOut, initScale, rng) {
    this.nIn = nIn; this.nOut = nOut;
    const sc = initScale * Math.sqrt(1 / nIn);
    this.W = new Float64Array(nIn * nOut);
    for (let i = 0; i < this.W.length; i++) this.W[i] = gaussian(rng) * sc;
    this.b = new Float64Array(nOut);
    this.gW = new Float64Array(nIn * nOut); this.gb = new Float64Array(nOut);
    this.mW = new Float64Array(nIn * nOut); this.vW = new Float64Array(nIn * nOut);
    this.mb = new Float64Array(nOut); this.vb = new Float64Array(nOut);
    this.x = null; this.B = 0;
  }
  forward(x, B) {
    const { nIn, nOut, W, b } = this; const y = new Float64Array(B * nOut);
    for (let n = 0; n < B; n++) {
      const xo = n * nIn, yo = n * nOut;
      for (let o = 0; o < nOut; o++) {
        let acc = b[o]; const wo = o * nIn;
        for (let i = 0; i < nIn; i++) acc += x[xo + i] * W[wo + i];
        y[yo + o] = acc;
      }
    }
    this.x = x; this.B = B; return y;
  }
  backward(dy) {
    const { nIn, nOut, W, x, B, gW, gb } = this; const dx = new Float64Array(B * nIn);
    gW.fill(0); gb.fill(0);
    for (let n = 0; n < B; n++) {
      const xo = n * nIn, yo = n * nOut;
      for (let o = 0; o < nOut; o++) {
        const g = dy[yo + o]; if (g === 0) continue; gb[o] += g;
        const wo = o * nIn;
        for (let i = 0; i < nIn; i++) { gW[wo + i] += g * x[xo + i]; dx[xo + i] += g * W[wo + i]; }
      }
    }
    return dx;
  }
  adam(lr, t, b1 = 0.9, b2 = 0.999, eps = 1e-8) {
    const c1 = 1 - Math.pow(b1, t), c2 = 1 - Math.pow(b2, t);
    const upd = (p, g, m, v) => {
      for (let i = 0; i < p.length; i++) {
        m[i] = b1 * m[i] + (1 - b1) * g[i];
        v[i] = b2 * v[i] + (1 - b2) * g[i] * g[i];
        p[i] -= lr * (m[i] / c1) / (Math.sqrt(v[i] / c2) + eps);
      }
    };
    upd(this.W, this.gW, this.mW, this.vW); upd(this.b, this.gb, this.mb, this.vb);
  }
}

/**
 * Multi-layer perceptron, tanh on every layer (so the output is in [−1, 1]),
 * trained by Adam on mean squared error.
 */
export class MLP {
  /**
   * @param {number[]} sizes e.g. [10, 32, 32, 1]
   * @param {number} initScale multiplier on the 1/sqrt(nIn) init (big = wild untrained driving)
   * @param {() => number} rng uniform PRNG, defaults to Math.random
   */
  constructor(sizes = [N_FEATURES, 32, 32, 1], initScale = 1, rng = Math.random) {
    this.sizes = sizes; this.layers = []; this.t = 0;
    for (let i = 0; i < sizes.length - 1; i++) this.layers.push(new Dense(sizes[i], sizes[i + 1], initScale, rng));
    this.params = this.layers.reduce((n, l) => n + l.W.length + l.b.length, 0);
    this.acts = [];
  }
  /**
   * @param {Float64Array} x B × sizes[0]
   * @param {number} B batch size
   * @returns {Float64Array} B outputs in [−1, 1]
   */
  forward(x, B) {
    this.acts.length = 0;
    let h = x;
    for (let i = 0; i < this.layers.length; i++) {
      h = this.layers[i].forward(h, B);
      for (let j = 0; j < h.length; j++) h[j] = Math.tanh(h[j]);
      this.acts.push(h);
    }
    return h;
  }
  /**
   * One Adam step on MSE between forward(X) and Y.
   * @returns {number} batch loss
   */
  trainStep(X, Y, B, lr) {
    const out = this.forward(X, B);
    let loss = 0; let g = new Float64Array(B);
    for (let n = 0; n < B; n++) { const e = out[n] - Y[n]; loss += e * e; g[n] = (2 * e / B) * (1 - out[n] * out[n]); }
    for (let i = this.layers.length - 1; i >= 0; i--) {
      g = this.layers[i].backward(g);
      if (i > 0) { const a = this.acts[i - 1]; for (let j = 0; j < g.length; j++) g[j] *= 1 - a[j] * a[j]; }
    }
    this.t++;
    for (const l of this.layers) l.adam(lr, this.t);
    return loss / B;
  }
}

/**
 * DAgger trainer for one track: owns the policy, a ring buffer of
 * (features, expert steer) samples and the attempt log.
 */
export class Trainer {
  /**
   * @param {object} track
   * @param {{seed?:number, lr?:number, batch?:number, initScale?:number, capacity?:number}} [opts]
   */
  constructor(track, { seed = 1, lr = 1e-3, batch = 64, initScale = 2.2, capacity = 24000 } = {}) {
    this.track = track; this.lr = lr; this.batch = batch; this.capacity = capacity;
    this.rng = mulberry32(seed);
    this.policy = new MLP([N_FEATURES, 32, 32, 1], initScale, this.rng);
    this.X = new Float64Array(capacity * N_FEATURES); this.Y = new Float64Array(capacity);
    this.samples = 0; this.writeIdx = 0;
    this.steps = 0; this.loss = 0; this.lossEMA = null; this.history = [];
    this.attempts = []; this.attempt = 1;
    this.f = new Float64Array(N_FEATURES);
    this.bx = new Float64Array(batch * N_FEATURES); this.by = new Float64Array(batch);
  }
  /** Policy steer for a state, in [−1, 1]. */
  act(state) {
    features(this.track, state, this.f);
    return this.policy.forward(this.f, 1)[0];
  }
  /** Append (features(state), expertSteer(state)) to the buffer. */
  record(state) {
    features(this.track, state, this.f);
    this.X.set(this.f, this.writeIdx * N_FEATURES);
    this.Y[this.writeIdx] = expertSteer(this.track, state);
    this.writeIdx = (this.writeIdx + 1) % this.capacity;
    if (this.samples < this.capacity) this.samples++;
  }
  /**
   * nSteps Adam steps on random minibatches from the buffer.
   * @returns {number|null} lossEMA
   */
  train(nSteps) {
    if (this.samples === 0) return this.lossEMA;
    const B = Math.min(this.batch, this.samples);
    for (let k = 0; k < nSteps; k++) {
      for (let n = 0; n < B; n++) {
        const j = Math.floor(this.rng() * this.samples);
        for (let i = 0; i < N_FEATURES; i++) this.bx[n * N_FEATURES + i] = this.X[j * N_FEATURES + i];
        this.by[n] = this.Y[j];
      }
      this.loss = this.policy.trainStep(this.bx, this.by, B, this.lr);
      this.lossEMA = this.lossEMA === null ? this.loss : this.lossEMA * 0.95 + this.loss * 0.05;
      this.steps++;
      if (this.steps % 10 === 0) this.history.push([this.steps, this.lossEMA]);
    }
    return this.lossEMA;
  }
  /** Close the current attempt and start the next one. */
  endAttempt({ distance = 0, crashed = false, lapTime = null } = {}) {
    this.attempts.push({ n: this.attempt, distance, crashed, lapTime });
    this.attempt++;
  }
  /** e.g. "2×32 mlp · 1,409 params · DAgger" */
  get description() {
    const hidden = this.policy.sizes.slice(1, -1);
    const same = hidden.every((h) => h === hidden[0]);
    const arch = same ? `${hidden.length}×${hidden[0]}` : hidden.join('×');
    return `${arch} mlp · ${this.policy.params.toLocaleString('en-US')} params · DAgger`;
  }
}
