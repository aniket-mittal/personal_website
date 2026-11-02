// ============================================================
//  main.js — the integrator. Owns the renderer, scene, camera and
//  composer, the per-track scene and Trainer caches, the two cars,
//  training and race modes, player input, caption / HUD / minimap and
//  the frame loop. See docs/DESIGN.md ("main.js (integrator)").
//
//  Modules: tracks.js (circuits), physics.js (car + expert), policy.js
//  (MLP + DAgger Trainer), car.js (procedural car), world.js (scene,
//  lighting, minimap), ascii.js (post-process).
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { AsciiPass, CELL_CSS } from './ascii.js';
import { allTracks } from './tracks.js';
import { CAR, makeCarState, stepCar, autoSpeed, resetToStart } from './physics.js';
import { Trainer } from './policy.js';
import { buildCar } from './car.js';
import { buildTrackScene, addLighting, drawMinimap, theme } from './world.js';

const THEME = theme();                             // paper / ink / fonts come from the page's CSS variables
const PAPER = parseInt(THEME.paper.slice(1), 16), INK = parseInt(THEME.ink.slice(1), 16);
const H = 1 / 60;                                  // fixed simulation step (s)
const TRAIN_SCALE = 1.5, RACE_SCALE = 1.0;         // sim seconds per real second
const RACE_LAPS = 2, RACE_OFFSET = 2.2, HOLD = 0.9;
const BURST = 150, BURST_PER_FRAME = 3;           // post-crash training burst, spread over the hold frames
const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const fmtT = (t) => `${t.toFixed(1)} s`;

// ---------- DOM ----------
const strip = $('strip'), canvas = $('scene'), minimap = $('minimap'), mctx = minimap.getContext('2d');
const msgEl = $('msg'), hud = $('race-hud'), lapEl = $('lap'), timeEl = $('time'), gapEl = $('gap'), fade = $('fade');
const dot = $('dot'), circuitEl = $('circuit'), attemptEl = $('attempt'), statusEl = $('status');
const samplesEl = $('samples'), lossEl = $('loss'), spark = $('spark'), sctx = spark.getContext('2d');
const raceBtn = $('race'), modeBtn = $('mode'), help = $('help');
const navLinks = Array.from(document.querySelectorAll('#nav a'));
if ($('year')) $('year').textContent = new Date().getFullYear();

// ---------- renderer / scene / camera / composer ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
const { sun } = addLighting(scene, renderer);     // paper background + FogExp2, hemi + shadowed sun
const camera = new THREE.PerspectiveCamera(24, 2, 0.1, 900);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());
const ascii = new AsciiPass({ paper: PAPER, ink: INK, gamma: 1.35, font: THEME.mono });   // cell defaults to 5 CSS px × dpr
ascii.enabled = false;                                                   // 3D by default
composer.addPass(ascii);

// ---------- tracks, per-track slots (scene + trainer + policy car state) ----------
const tracks = allTracks();
const SECTIONS = tracks.map((t) => t.id);
const N = tracks.length;
const slots = tracks.map((track, i) => ({
  i, track, trainer: null, world: null,
  state: makeCarState(track),   // the policy car
  nextRecord: 1,                // next distance (m) at which to record + train
  dist0: 0,                     // distance at the start of the current attempt
  hold: 0,                      // seconds left of the off-track pause
  burstLeft: 0,                 // post-crash training steps still to run
  best: null, laps: 0,
}));
function ensure(slot) {
  if (!slot.trainer) slot.trainer = new Trainer(slot.track, { seed: (Date.now() + slot.i * 7919) >>> 0 });
  if (!slot.world) slot.world = buildTrackScene(slot.track);
  return slot;
}
let cur = null;                  // current slot
let mode = 'train';              // 'train' | 'race'
let acc = 0;                     // sim-time accumulator (s)
let race = null;                 // race-mode state

// ---------- cars ----------
const policyCar = buildCar();
const playerCar = buildCar({ body: 0xf3f1ea, accent: 0xc5302c, wings: 0x1b1917, fin: false, helmet: 0xf3f1ea });
playerCar.group.visible = false;
scene.add(policyCar.group, playerCar.group);
const vis = { policy: { v: 0 }, player: { v: 0 } };

/** Place a car mesh on its sim state and animate wheels / roll / rain light. */
function syncCar(car, state, mem, simDt, dtReal) {
  car.group.position.set(state.x, 0, state.z);
  car.group.rotation.y = state.theta;
  const moving = simDt > 0;
  const accel = moving ? (state.v - mem.v) / simDt : 0;
  mem.v = state.v;
  car.update({ v: moving ? state.v : 0, steer: state.kappa / CAR.maxKappa, accel, latAcc: state.v * state.v * state.kappa, dt: moving ? simDt : dtReal });
}

// ---------- messages ----------
let msgTimer = 0;
function say(text, seconds = 1.6) {
  msgEl.textContent = text; msgEl.classList.add('show');
  clearTimeout(msgTimer);
  if (seconds > 0) msgTimer = setTimeout(() => msgEl.classList.remove('show'), seconds * 1000);
}
function hush() { clearTimeout(msgTimer); msgEl.classList.remove('show'); }

// ---------- camera (chase) + sun ----------
let camH = 0;
const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), tmp = new THREE.Vector3();
function camGoals(state) {
  const sf = Math.min(1, state.v / 40), back = 6.8 + 2.0 * sf;
  return {
    sf,
    pos: [state.x + Math.sin(camH) * back, 2.15, state.z + Math.cos(camH) * back],       // behind = −forward
    tgt: [state.x - Math.sin(camH) * 8, 0.35, state.z - Math.cos(camH) * 8],             // 8 m ahead, 0.35 m up
  };
}
function updateCamera(state, dtReal) {
  camH += wrapAngle(state.theta - camH) * Math.min(1, 3 * dtReal);
  const g = camGoals(state), k = 1 - Math.exp(-6 * dtReal);
  camPos.lerp(tmp.set(...g.pos), k); camTgt.lerp(tmp.set(...g.tgt), k);
  camera.position.copy(camPos); camera.lookAt(camTgt);
  camera.fov = 24 + 5 * g.sf; camera.updateProjectionMatrix();
}
function snapCamera(state) {
  camH = state.theta;
  const g = camGoals(state);
  camPos.set(...g.pos); camTgt.set(...g.tgt);
  camera.position.copy(camPos); camera.lookAt(camTgt);
  camera.fov = 24; camera.updateProjectionMatrix();
}
function followSun(state) {
  sun.position.set(state.x + 30, 60, state.z + 20);
  sun.target.position.set(state.x, 0, state.z);
  sun.target.updateMatrixWorld();
}

// ---------- training mode ----------
/** One sim step of the policy car under DAgger. Returns true if the attempt ended off track. */
function trainStep(slot) {
  const { track, trainer, state } = slot;
  const sp = autoSpeed(track, state);
  const lapBefore = state.lap;
  stepCar(state, { throttle: sp.throttle, brake: sp.brake, steer: trainer.act(state) }, H, track);
  if (state.distance >= slot.nextRecord) { trainer.record(state); trainer.train(2); slot.nextRecord += 1; }
  if (state.off) {
    slot.hold = HOLD; slot.burstLeft = BURST;
    say(`Off track · ${Math.round(state.distance - slot.dist0)} m`, 0);
    trainer.endAttempt({ distance: state.distance - slot.dist0, crashed: true, lapTime: null });
    return true;
  }
  if (state.lap > lapBefore) {
    const t = state.lastLapTime;
    slot.laps++;
    slot.best = slot.best === null ? t : Math.min(slot.best, t);
    say(slot.laps === 1 ? `First full lap · ${fmtT(t)}` : `Lap ${fmtT(t)}`, 2.2);
    trainer.endAttempt({ distance: state.distance - slot.dist0, crashed: false, lapTime: t });
    slot.dist0 = state.distance;
  }
  return false;
}
/**
 * Close an off-track attempt (the attempt itself was logged when the crash was
 * detected): train whatever is left of the 150-step burst, reset to the line,
 * announce the next attempt. Most of the burst is spread over the hold frames
 * by updateTraining so no single frame pays ~35 ms of compute.
 */
function finishCrash(slot) {
  const { track, trainer, state } = slot;
  slot.hold = 0;
  if (slot.burstLeft > 0) { trainer.train(slot.burstLeft); slot.burstLeft = 0; }
  resetToStart(state, track, 0);
  slot.nextRecord = 1; slot.dist0 = 0; vis.policy.v = 0; acc = 0;
  say(`Attempt ${trainer.attempt}`, 1.6);
  if (slot === cur) { snapCamera(state); followSun(state); }
}
/** Abandon whatever the slot was doing (section switch); closes a pending crash without the burst. */
function abandon(slot) {
  slot.hold = 0; slot.burstLeft = 0;
  resetToStart(slot.state, slot.track, 0);
  slot.nextRecord = 1; slot.dist0 = 0;
}
function updateTraining(dtReal) {
  const slot = cur;
  if (slot.hold > 0) {                        // camera and car stopped while the message holds
    slot.hold -= dtReal;
    if (slot.burstLeft > 0) {               // ~3 steps per frame at 60 fps, more on slower frames, so the burst ends with the hold
      const k = Math.min(slot.burstLeft, Math.max(BURST_PER_FRAME, Math.ceil((BURST * dtReal) / HOLD)));
      slot.trainer.train(k); slot.burstLeft -= k;
    }
    if (slot.hold <= 0) finishCrash(slot);
    return 0;
  }
  acc += dtReal * TRAIN_SCALE;
  let used = 0;
  for (let n = 0; acc >= H && n < 8; n++) {
    acc -= H; used += H;
    if (trainStep(slot)) { acc = 0; break; }
  }
  return used;
}

// ---------- race mode ----------
const keys = { up: false, down: false, left: false, right: false };
const KEYMAP = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
function onKey(e, down) {
  const k = KEYMAP[e.key];
  if (!k || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target instanceof Element && e.target.closest('input, textarea, [contenteditable]')) return;
  keys[k] = down;
  if (race) e.preventDefault();
}
window.addEventListener('keydown', (e) => onKey(e, true));
window.addEventListener('keyup', (e) => onKey(e, false));
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

/** +1 if the first corner after the line turns left, −1 if right. */
function firstCornerSign(track) {
  for (let k = 5; k < track.n; k++) if (Math.abs(track.curv[k]) > 0.012) return Math.sign(track.curv[k]);
  return 1;
}
const progress = (state, track) => state.lap * track.length + state.s;

function startRace() {
  const slot = ensure(cur);
  if (slot.hold > 0) finishCrash(slot);
  const sign = firstCornerSign(slot.track);
  const dPlayer = -RACE_OFFSET * sign;                         // inside of the first corner (left turn → left)
  const player = makeCarState(slot.track, slot.track.startS, dPlayer);
  resetToStart(slot.state, slot.track, -dPlayer);
  slot.nextRecord = 1; slot.dist0 = 0;
  race = { phase: 'count', t: 0, count: -1, raceT: 0, player, steer: 0, pFin: null, qFin: null, done: 0, pOff: false };
  mode = 'race'; acc = 0; vis.player.v = 0; vis.policy.v = 0;
  for (const k in keys) keys[k] = false;
  playerCar.group.visible = true;
  document.body.classList.add('racing');
  raceBtn.textContent = 'back to training'; help.classList.add('show'); hud.hidden = false;
  updateHud();
  snapCamera(player); followSun(player);
}
function endRace() {
  race = null; mode = 'train'; acc = 0;
  playerCar.group.visible = false;
  document.body.classList.remove('racing');
  abandon(cur); vis.policy.v = 0;
  raceBtn.textContent = 'race it'; help.classList.remove('show'); hud.hidden = true;
  lapEl.textContent = timeEl.textContent = gapEl.textContent = '';
  say(`Attempt ${cur.trainer.attempt}`, 1.6);
  snapCamera(cur.state); followSun(cur.state);
}
function raceStep() {
  const { track, trainer, state } = cur, p = race.player, L = track.length;
  const sp = autoSpeed(track, state);
  stepCar(state, { throttle: sp.throttle, brake: sp.brake, steer: trainer.act(state) }, H, track);   // no recording, no training
  if (state.off) {                       // an untrained policy would otherwise vanish into the fog: put it back on the centreline, slowly
    const p0 = track.pose(state.s);
    state.x = p0.x; state.z = p0.z; state.theta = p0.theta; state.d = 0; state.psi = 0;
    state.v = Math.min(state.v, 10); state.kappa = 0; state.off = false;
  }
  const target = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
  race.steer += clamp(target - race.steer, -6 * H, 6 * H);
  stepCar(p, { throttle: keys.up ? 1 : 0, brake: keys.down ? 1 : 0, steer: race.steer }, H, track);
  if (p.off !== race.pOff) { race.pOff = p.off; if (p.off && race.phase === 'run') say('Off track', 1.2); }
  race.raceT += H;
  if (race.qFin === null && state.lap >= RACE_LAPS) {
    race.qFin = race.raceT;
    if (race.pFin === null) say(`Policy finished · ${fmtT(race.qFin)}`, 1.6);
  }
  if (race.pFin === null && p.lap >= RACE_LAPS) {
    race.pFin = race.raceT;
    let text;
    if (race.qFin !== null) text = `You lost by ${(race.pFin - race.qFin).toFixed(1)} s`;
    else {
      const remaining = RACE_LAPS * L - progress(state, track);
      text = `You won by ${(remaining / Math.max(state.v, 8)).toFixed(1)} s`;
    }
    say(text, 3); race.phase = 'done'; race.done = 3;
  }
}
function updateRace(dtReal) {
  race.t += dtReal;
  if (race.phase === 'count') {
    const c = Math.min(3, Math.floor(race.t));
    if (c !== race.count) { race.count = c; say(['3', '2', '1', 'Go'][c], c < 3 ? 1.0 : 0.9); if (c === 3) race.phase = 'run'; }
    return 0;
  }
  acc += dtReal * RACE_SCALE;
  let used = 0;
  for (let n = 0; acc >= H && n < 8; n++) { acc -= H; used += H; raceStep(); }
  if (race.phase === 'done') { race.done -= dtReal; if (race.done <= 0) endRace(); }
  return used;
}
function updateHud() {
  if (!race) return;
  const { track, state } = cur, p = race.player;
  lapEl.textContent = `Lap ${Math.min(p.lap + 1, RACE_LAPS)}/${RACE_LAPS}`;
  timeEl.textContent = fmtT(race.pFin !== null ? race.pFin : race.raceT);
  if (race.phase === 'count') { gapEl.textContent = ''; return; }
  const diff = progress(state, track) - progress(p, track);             // metres you are behind
  const sign = diff >= 0 ? '+' : '−';
  if (p.v < 5) gapEl.textContent = `${sign}${Math.abs(diff).toFixed(0)} m to policy`;   // standing still: a time gap is meaningless
  else { const ref = Math.max(p.v, state.v, 8); gapEl.textContent = `${sign}${Math.abs(diff / ref).toFixed(1)} s to policy`; }
}

// ---------- caption, sparkline, minimap ----------
const inkCss = THEME.ink;
function drawSpark(history) {
  const w = spark.width, h = spark.height;
  sctx.clearRect(0, 0, w, h);
  if (history.length < 2) return;
  const step = Math.max(1, Math.floor(history.length / 160));
  let maxL = 0; for (let i = 0; i < history.length; i += step) maxL = Math.max(maxL, history[i][1]);
  const maxS = history[history.length - 1][0] || 1;
  if (!(maxL > 0)) return;
  sctx.strokeStyle = inkCss; sctx.lineWidth = 1; sctx.beginPath();
  for (let i = 0, k = 0; i < history.length; i += step, k++) {
    const [s, l] = history[i], x = (s / maxS) * (w - 1), y = h - 1 - (l / maxL) * (h - 2);
    k ? sctx.lineTo(x, y) : sctx.moveTo(x, y);
  }
  sctx.stroke();
}
function updateCaption() {
  const { track, trainer, state } = cur;
  circuitEl.textContent = `${track.circuit}, 1:${Math.round(track.scale)}`;
  attemptEl.textContent = trainer.attempt;
  statusEl.textContent = cur.best !== null ? `lap ${fmtT(cur.best)}` : `${Math.round(Math.max(0, state.distance - cur.dist0))} m`;
  samplesEl.textContent = trainer.samples.toLocaleString('en-US');
  lossEl.textContent = trainer.lossEMA === null ? '—' : trainer.lossEMA.toFixed(4);
  drawSpark(trainer.history);
}
function updateMinimap() {
  const cars = [{ x: cur.state.x, z: cur.state.z, color: inkCss, r: 3 }];
  if (race) cars.push({ x: race.player.x, z: race.player.z, color: '#c5302c', r: 3 });
  drawMinimap(mctx, cur.track, cars, minimap.width, minimap.height);
}

// ---------- sections ----------
function showSection(i) {
  for (let j = 0; j < N; j++) {
    const p = $(SECTIONS[j]); if (!p) continue;
    p.classList.toggle('show', j === i);
    // inline demo videos only run while their section is on screen
    p.querySelectorAll('video[autoplay]').forEach((v) => { if (j === i) { const r = v.play(); if (r && r.catch) r.catch(() => {}); } else v.pause(); });
    // embedded preview iframes are only loaded while visible (src ↔ data-src) so hidden tabs stay silent and light
    p.querySelectorAll('iframe[data-src]').forEach((f) => { if (j === i) { if (!f.src) f.src = f.dataset.src; } else if (f.src) f.removeAttribute('src'); });
  }
  navLinks.forEach((a) => a.classList.toggle('active', +a.dataset.i === i));
  try { if (location.hash !== '#' + SECTIONS[i]) history.replaceState(null, '', '#' + SECTIONS[i]); } catch (e) { /* file:// etc. */ }
}
/** Make slot i current: swap the track scene, reset the cars, refresh the caption. */
function activate(i) {
  if (race) endRace();
  const prev = cur;
  if (prev) { abandon(prev); if (prev.world) scene.remove(prev.world.group); }
  cur = ensure(slots[i]);
  scene.add(cur.world.group);
  abandon(cur); acc = 0; vis.policy.v = 0;
  hush();
  snapCamera(cur.state); followSun(cur.state);
  updateCaption(); updateMinimap();
  say(`Attempt ${cur.trainer.attempt}`, 1.6);
}
let switching = false, queued = null;
function goTo(i) {
  i = ((i % N) + N) % N;
  if (switching) { queued = i; return; }
  if (cur && i === cur.i) { showSection(i); return; }
  switching = true;
  navLinks.forEach((a) => a.classList.toggle('active', +a.dataset.i === i));
  fade.classList.add('on');
  setTimeout(() => {
    activate(i); showSection(i);
    requestAnimationFrame(() => {
      fade.classList.remove('on'); switching = false;
      if (queued !== null) { const q = queued; queued = null; if (q !== cur.i) goTo(q); }
    });
  }, 270);
}
navLinks.forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); goTo(+a.dataset.i); }));
window.addEventListener('hashchange', () => {
  const i = SECTIONS.indexOf(location.hash.slice(1));
  if (i >= 0 && cur && i !== cur.i) goTo(i);
});

// ---------- controls ----------
raceBtn.addEventListener('click', () => { if (race) endRace(); else startRace(); });
modeBtn.addEventListener('click', () => {
  ascii.enabled = !ascii.enabled;
  modeBtn.textContent = ascii.enabled ? '3d' : 'ascii';
  resize();
});

// ---------- sizing ----------
function resize() {
  const w = strip.clientWidth, h = strip.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  const scale = ascii.enabled ? 0.5 : 1;        // ASCII only needs a few pixels per glyph cell
  composer.setPixelRatio(dpr);
  composer.setSize(w * scale, h * scale);
  ascii.setSize(w * dpr, h * dpr);
  ascii.uniforms.cell.value = CELL_CSS * dpr;
}
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(strip);
else window.addEventListener('resize', resize);

// ---------- fonts (optional) ----------
(async () => {
  try {
    if (!document.fonts || !document.fonts.load) return;
    await Promise.race([
      Promise.all([document.fonts.load(`500 24px ${THEME.mono}`), document.fonts.load(`italic 500 24px ${THEME.serif}`)]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
    ascii.refresh();                             // re-measure the glyph ramp with the real mono font
  } catch (e) { /* the fallback font is fine */ }
})();

// ---------- start: the section named in the URL, no scroll jump ----------
try { history.scrollRestoration = 'manual'; } catch (e) { /* unsupported */ }
window.scrollTo(0, 0);
requestAnimationFrame(() => window.scrollTo(0, 0));
window.addEventListener('load', () => window.scrollTo(0, 0), { once: true });
hud.hidden = true;
modeBtn.textContent = 'ascii';
{
  const i0 = Math.max(0, SECTIONS.indexOf(location.hash.slice(1)));
  activate(i0); showSection(i0);
}
resize();

// ---------- loop ----------
let last = performance.now(), capAcc = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dtReal = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  let simDt = 0;
  if (!switching) simDt = mode === 'race' ? updateRace(dtReal) : updateTraining(dtReal);

  syncCar(policyCar, cur.state, vis.policy, simDt, dtReal);
  const focus = race ? race.player : cur.state;
  if (race) syncCar(playerCar, race.player, vis.player, simDt, dtReal);
  if (!(mode === 'train' && cur.hold > 0) && !switching) updateCamera(focus, dtReal);   // camera stops during the off-track hold
  followSun(focus);

  capAcc += dtReal;
  if (capAcc >= 0.1) { capAcc = 0; updateCaption(); updateHud(); }
  updateMinimap();
  dot.classList.toggle('live', mode === 'train' && cur.hold <= 0 && !switching);

  // the sim and training keep running while the strip is scrolled away; only drawing is skipped
  if (!stripVisible) return;
  // ascii off: draw straight to the canvas so its MSAA applies (the composer's
  // HalfFloat target is not multisampled, and OutputPass only does the sRGB
  // encode the renderer already applies when drawing to the canvas)
  if (ascii.enabled) composer.render(); else renderer.render(scene, camera);
}
let stripVisible = true;
if (typeof IntersectionObserver !== 'undefined') {
  new IntersectionObserver(([e]) => { stripVisible = e.isIntersecting; }, { threshold: 0 }).observe(strip);
}
requestAnimationFrame(loop);
