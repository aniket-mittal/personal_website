// node tests/policy.test.mjs — the expert laps every circuit, and a fresh
// DAgger Trainer learns to lap each one within a few attempts.
import { allTracks } from '../tracks.js';
import { makeCarState, stepCar, autoSpeed, expertSteer, resetToStart } from '../physics.js';
import { Trainer } from '../policy.js';

const DT = 1 / 60, SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], MAX_ATTEMPTS = 10;
const STEPS_PER_SAMPLE = 2, BURST = 150;
let failures = 0;
const fail = (msg) => { failures++; console.log('  FAIL ' + msg); };

function expertLap(track) {
  const st = makeCarState(track);
  let maxAbsD = 0;
  while (st.lap < 1 && st.t < 180) {
    const sp = autoSpeed(track, st);
    stepCar(st, { throttle: sp.throttle, brake: sp.brake, steer: expertSteer(track, st) }, DT, track);
    maxAbsD = Math.max(maxAbsD, Math.abs(st.d));
    if (st.off) return { ok: false, t: st.t, maxAbsD, distance: st.distance };
  }
  return { ok: st.lap >= 1, t: st.lastLapTime, maxAbsD, distance: st.distance };
}

// one seed: simulate the attempt loop; return the attempt number of the first lap (or null)
function learn(track, seed) {
  const trainer = new Trainer(track, { seed });
  const st = makeCarState(track);
  let lastRec = 0, used = 0;
  while (used < MAX_ATTEMPTS) {
    const sp = autoSpeed(track, st);
    stepCar(st, { throttle: sp.throttle, brake: sp.brake, steer: trainer.act(st) }, DT, track);
    if (st.distance - lastRec >= 1) { trainer.record(st); trainer.train(STEPS_PER_SAMPLE); lastRec = st.distance; }
    if (st.lap >= 1) {
      const n = trainer.attempt;
      trainer.endAttempt({ distance: st.distance, crashed: false, lapTime: st.lastLapTime });
      return { first: n, lapTime: st.lastLapTime, samples: trainer.samples, steps: trainer.steps, loss: trainer.lossEMA };
    }
    if (st.off || st.distance > 3 * track.length) {
      trainer.endAttempt({ distance: st.distance, crashed: st.off, lapTime: null });
      trainer.train(BURST);
      resetToStart(st, track); lastRec = 0; used++;
    }
  }
  return { first: null, samples: trainer.samples, steps: trainer.steps, loss: trainer.lossEMA };
}

const t0 = Date.now();
const rows = [];
for (const track of allTracks()) {
  const tt = Date.now();
  const ex = expertLap(track);
  if (!ex.ok) fail(`${track.circuit}: expert went off / did not lap (t=${ex.t.toFixed(1)} s, ${ex.distance.toFixed(0)} m)`);
  const firsts = [], samples = [];
  let lapTimes = [];
  for (const seed of SEEDS) {
    const r = learn(track, seed);
    firsts.push(r.first); samples.push(r.samples);
    if (r.lapTime) lapTimes.push(r.lapTime);
  }
  const solved = firsts.filter((n) => n !== null);
  const sorted = firsts.map((n) => (n === null ? MAX_ATTEMPTS + 1 : n)).sort((a, b) => a - b);
  const median = (sorted[4] + sorted[5]) / 2;
  if (solved.length < 8) fail(`${track.circuit}: only ${solved.length}/10 seeds lapped within ${MAX_ATTEMPTS} attempts`);
  if (median > 6) fail(`${track.circuit}: median attempts-to-first-lap ${median} > 6`);
  rows.push({
    track: track.circuit, 'expert lap': `${ex.t.toFixed(1)} s`, 'max|d|': ex.maxAbsD.toFixed(2),
    'attempts per seed': firsts.map((n) => (n === null ? '×' : n)).join(' '),
    median, solved: `${solved.length}/10`,
    'policy lap': lapTimes.length ? `${(lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length).toFixed(1)} s` : '—',
    'time': `${((Date.now() - tt) / 1000).toFixed(1)} s`,
  });
}

const cols = Object.keys(rows[0]);
const widths = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c]).length)));
const line = (vals) => vals.map((v, i) => String(v).padEnd(widths[i])).join('  ');
console.log(`dt=${DT.toFixed(4)}  record every 1 m  train(${STEPS_PER_SAMPLE})/sample  train(${BURST}) at reset  ≤${MAX_ATTEMPTS} attempts  seeds ${SEEDS[0]}–${SEEDS[SEEDS.length - 1]}`);
console.log(line(cols));
console.log(line(widths.map((w) => '-'.repeat(w))));
for (const r of rows) console.log(line(cols.map((c) => r[c])));
console.log(`total ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log(failures ? `\n${failures} failure(s)` : '\nall policy checks passed');
process.exit(failures ? 1 : 0);
