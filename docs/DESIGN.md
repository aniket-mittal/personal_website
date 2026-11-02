# DESIGN.md — the interface contract for the site rebuild

Read this fully before writing code. Several people build modules in parallel
against this document; the integrator wires them together without talking to
you. If you must deviate, document it at the top of your file in a comment
block titled `DEVIATIONS FROM DESIGN.md`.

## What the site is

An editorial personal website (cream paper `#f6f4ee`, ink `#1b1917`, Newsreader
serif, IBM Plex Mono for captions) with a full-width 3D strip at the top.
The strip shows a black open-wheel car on a **scaled-down real F1 circuit**.
There are five sections, each with its own circuit:

| i | section id   | nav label  | circuit (scaled ≈ 1:4) | character |
|---|--------------|------------|------------------------|-----------|
| 0 | `about`      | About      | Silverstone            | fast, flowing (Maggotts/Becketts) |
| 1 | `projects`   | Projects   | Spa-Francorchamps      | long, Eau Rouge, Pouhon, Bus Stop |
| 2 | `experience` | Experience | Monza                  | straights, chicanes, Parabolica |
| 3 | `hobbies`    | Hobbies    | Interlagos             | anticlockwise, Senna S, tight infield |
| 4 | `contact`    | Contact    | Monaco                 | tight, hairpin, swimming pool |

The policy that drives the car is a small neural network trained **live in the
browser** by on-policy imitation (DAgger): it drives, goes off, resets, trains
on what it saw, tries again, until it completes a lap, then keeps improving.
Each circuit has its own fresh policy. The visitor can press **Race it** and
drive a second, white car against the policy for two laps.

The strip renders in **3D by default**. An **ascii** toggle switches to an ASCII
post-process (paper + ink glyphs, finer than before). Nothing else changes.

No build step. ES modules. three@0.170.0 via the import map in `index.html`
(`three` and `three/addons/`). Files that do not need three.js must not import
it, so they can be tested in Node: `tracks.js`, `physics.js`, `policy.js`.

## Conventions (everyone)

* Units: metres, seconds, radians. y is up. The track lives in the xz plane.
* Heading `theta`: a car with `rotation.y = theta` faces its local −z, so
  `forward = (−sin θ, 0, −cos θ)` and `right = (cos θ, 0, −sin θ)`.
  Positive curvature / positive steer = **left** turn (θ increases).
* Arc length `s` runs along the direction of travel, wraps at `track.length`.
* Lateral offset `d` is **positive to the right** of the direction of travel.
* Heading error `psi` = car heading − tangent heading, wrapped to (−π, π].
* Half-width of the road: `track.hw` (5.5 m). Barriers sit at `hw + 6`.
* Random numbers: `policy.js` uses its own seedable PRNG (mulberry32) so Node
  tests are reproducible. Browser code may seed from `Date.now()`.
* Style: small ES modules, named exports, JSDoc on exports, no classes where a
  function will do. No TypeScript. Keep each file under ~500 lines.

## tracks.js (pure JS)

```js
export const TRACKS = [/* five defs, in section order above */];
// def = { id, name, circuit: 'Silverstone', scale, clockwise: bool,
//         points: [[x, z], ...] /* control points of a closed Catmull-Rom loop */,
//         startIndex: 0 /* which control point is the start/finish */,
//         banners: ['Berkeley', 'machine learning', ...] /* 4–7 short strings */ }
export function buildTrack(def) -> Track
export function allTracks() -> Track[]   // builds and caches all five
```

`Track`:

```js
{
  id, name, circuit, hw: 5.5, length, n, ds: 1.0,
  // sampled centreline at equal arc length (index i ↔ s = i * ds):
  x: Float64Array(n), z: Float64Array(n),
  tx: Float64Array(n), tz: Float64Array(n),   // unit tangents in direction of travel
  theta: Float64Array(n),                     // tangent heading, per the convention above
  curv: Float64Array(n),                      // signed curvature, + = left
  banners: [{ s, side: -1|1, text }],         // placed by buildTrack, spread evenly around the lap
  startS: 0,
  bounds: { minX, maxX, minZ, maxZ },
  pose(s) -> { x, z, theta }                  // on the centreline, s wraps
  curvAt(s) -> number                         // s wraps, linear interpolation
  project(x, z, hint) -> { i, s, d, psiRef }  // nearest centreline sample; hint = previous i
                                              // (search ±60 samples around hint, else global via a 20 m grid)
}
```

Implementation notes: closed centripetal Catmull-Rom through `points`, densely
sampled, then resampled at `ds = 1 m` by arc length; tangents by central
difference; curvature from the tangent angle derivative, smoothed with a 5-sample
box filter. Scale the real layouts so laps are **900–1400 m** and the bounding
box fits in ±260 m. Draw the layouts as faithfully as you can from memory, and
run `tests/tracks.test.mjs` to prove: no self-intersection (minimum distance
between any two samples more than 30 m apart in `s` is greater than `2*hw + 8`),
max |curvature| ≤ 0.09 (min radius ≈ 11 m), lap length in range.

## physics.js (pure JS)

```js
export const CAR = {
  wheelbase: 3.6, maxSpeed: 58, accel: 16, brake: 30, drag: 0.0042,
  maxKappa: 0.09, steerRate: 0.35 /* 1/m per s */, aLatMax: 34,
  grassMaxSpeed: 22, grassDrag: 0.09, offTrackMargin: 1.6 /* |d| > hw + margin = off */,
};
export function makeCarState(track, s = track.startS, dOffset = 0) -> state
// state = { x, z, theta, v, kappa, s, d, psi, i, off, lap, lapStartT, lastLapTime, distance, t }
export function stepCar(state, input, dt, track)
// input = { throttle: 0..1, brake: 0..1, steer: -1..1 }  (steer → target kappa = steer * maxKappa,
// slewed at steerRate). Kinematic bicycle. Longitudinal: accel*(1 - v/maxSpeed)*throttle − brake
// − drag*v² − rolling 0.4; on grass (|d| > hw) extra grassDrag*v and clamp to grassMaxSpeed.
// Lateral acceleration v²|κ| is capped at aLatMax by scaling κ (understeer), not by crashing.
// Updates s/d/psi/i via track.project (hint = state.i), distance += v*dt, t += dt,
// off = |d| > hw + offTrackMargin, lap++ when s wraps past startS going forward (set lastLapTime).
export function autoSpeed(track, state, lookahead = 90) -> { throttle, brake }
// target v from upcoming curvature: for each sample ahead up to `lookahead` metres,
// vAllowed(k) = sqrt(aLatMax / max(|curv|, 1e-4)); braking-distance aware
// (v² − vAllowed² ≤ 2*brake*dist). Bang-bang with a proportional band.
export function expertSteer(track, state) -> number in [-1, 1]
// pure pursuit on the centreline: lookahead L = clamp(0.55*v + 5, 7, 26) metres ahead in s,
// target = track.pose(s + L); alpha = angle from car heading to target in the car frame;
// kappa = 2*sin(alpha)/L; steer = clamp(kappa / maxKappa, -1, 1).
export function resetToStart(state, track, dOffset = 0)
```

## policy.js (pure JS)

```js
export const N_FEATURES = 10;
export function features(track, state, out) -> out
// [ d/hw, psi/0.7, kappa/maxKappa, v/maxSpeed,
//   curvAt(s+6)/maxKappa, curvAt(s+12)/maxKappa, curvAt(s+22)/maxKappa,
//   curvAt(s+36)/maxKappa, curvAt(s+55)/maxKappa, curvAt(s+80)/maxKappa ]
export function mulberry32(seed) -> () => number
export class MLP        // sizes [10, 32, 32, 1], tanh everywhere, Adam; constructor(sizes, initScale, rng)
                        // forward(x, B) -> Float64Array(B); trainStep(X, Y, B, lr) -> loss; params (count)
export class Trainer {  // DAgger for one track
  constructor(track, { seed, lr = 1e-3, batch = 64, initScale = 1.8, capacity = 24000 })
  policy: MLP; steps; loss; lossEMA; history: [[step, lossEMA]]  // push every 10 steps
  attempts: [{ n, distance, crashed, lapTime }]; attempt: number (1-based, current)
  samples: number
  act(state) -> steer in [-1, 1]            // policy forward on features(track, state)
  record(state)                              // append (features, expertSteer(track, state)) to the buffer
  train(nSteps) -> lossEMA                   // nSteps Adam steps on random minibatches from the buffer
  endAttempt({ distance, crashed, lapTime }) // push to attempts, start the next one
  readonly description: string               // e.g. "2×32 mlp · 1,409 params · DAgger"
}
```

Behaviour the Node test must prove (`tests/policy.test.mjs`), simulating with
`stepCar` at dt = 1/60, the policy steering, `autoSpeed` for throttle/brake,
`record()` every 1 m of distance, `train(2)` every recorded sample, and
`train(150)` at each reset: **from a fresh Trainer the car completes a lap on
every one of the five circuits within at most 10 attempts for at least 8 of 10
seeds, median ≤ 6.** Tune `lr`, `initScale`, steps-per-sample and the burst to
hit that; report the attempt counts per track in the test output. Also assert
the expert alone completes a lap on every track without going off.

Why it should work: early attempts crash because the policy visits states the
expert never showed it; recording the expert's label on the policy's own
trajectory is exactly what DAgger fixes.

## car.js (three)

Lift the procedural car from the current `main.js` (functions `superPts`,
`loft`, `bodySections`, `foilShape`, `wingElement`, `rod`, `buildCar`) into a
module and parametrise the livery:

```js
export function buildCar({ body = 0x07080a, accent = 0x07080a, wings = 0x0b0c0f, fin = true,
                           helmet = 0x0d0e12, rimColor = 0x1a1b1f } = {}) ->
  { group, chassis, wheels: [{ pivot, spin, front }], rainLight,
    update({ v, steer, accel, latAcc, dt }) /* spins wheels, steers fronts, rolls/pitches chassis, blinks rain light under braking */ }
```

Two liveries are used: the **policy car** (defaults: black) and the **player
car**: `body 0xf3f1ea` (paper white), `accent 0xc5302c` (a red nose and engine
cover stripe), `wings 0x1b1917`, `fin false`, `helmet 0xf3f1ea`. The two must
be told apart at a glance in both 3D and ASCII.

## world.js (three)

```js
export function buildTrackScene(track) -> { group, dispose() }
// grass ground (large plane, pale 0xe2e3d8 with subtle noise), asphalt ribbon (0x80838a),
// white edge lines, red/white kerbs where |curv| > 0.012 (both sides), low barriers at ±(hw+6)
// (1 m tall, 0xc4c4bf), checkered start/finish line at startS, and the banners:
// small boards 4 m × 0.9 m on two thin posts, 1.4 m off the ground, 2.5 m outside the road edge,
// facing the road, pale card (0xf7f5ef) with grey (0x7d786e) serif text from a canvas texture,
// no emissive, no glow. Subtle. Also 2–3 "100/50" braking boards before the biggest stops if cheap.
export function addLighting(scene) // hemisphere + shadowed directional; return { sun } so the caller
                                   // can move sun.position / sun.target to follow the focus car
export function drawMinimap(ctx, track, cars /* [{x, z, color, r}] */, w, h)
// clear, 1 px ink line for the centreline (fit to w×h with 8 px padding, preserve aspect),
// a 2 px tick at the start line, filled circles for the cars.
```

Day lighting; `scene.background` and `FogExp2` are paper (`0xf6f4ee`, density
≈ 0.0045) so the far track dissolves into the page. Tone mapping off.

## ascii.js (three)

Keep the current API (`new AsciiPass({cell, paper, ink, gamma})`, `setSize(w,h)`,
`uniforms.cell`, `enabled`) and improve detail:

* default cell **5 CSS px × dpr** (was 8),
* glyph ramp of ~24 levels chosen from a candidate set by **measured ink
  coverage** (draw each candidate, count pixels, sort, pick evenly spaced
  coverage levels; first level is space),
* 5-tap sampling as now; keep the tint for kerbs/rain light,
* export `measureRamp(candidates, font)` for tests/debug.

## index.html + style.css

Keep the current look (see the existing files). Changes:

* Sections: About, Projects, Experience, Hobbies, Contact (`.panel` ids as in
  the table, nav `a[data-i]` 0–4). Contact keeps its list. Hobbies: four short
  entries (Formula 1 — with a line on why the circuits here are scaled 1:4 —
  running, cooking, and one more), prose, no cards.
* Strip (`#strip`) contains, in order: `canvas#scene`, `canvas#minimap`
  (absolute, top-right, 170×110, transparent, pointer-events none), `div#msg`
  (absolute, centred near the top, serif italic, ink, fades in/out via class
  `show`; used for “Attempt 3”, “Off track · 212 m”, “Lap 38.1 s”, “3 · 2 · 1 · Go”,
  “You won by 1.4 s”), `div#race-hud` (absolute, bottom-left, mono 12 px:
  `#lap` “Lap 1/2”, `#time`, `#gap` “+1.2 s to policy”), `div#fade` (absolute
  inset 0, paper, opacity 0 → 1 via class `on`, transition 250 ms; used when
  switching circuits), and the two edge buttons are **removed**.
* Caption row (mono 12 px) left: `#dot` ● live indicator, `#circuit` (“Silverstone, 1:4”),
  `·` attempt `#attempt`, `·` `#status` (“212 m” while driving / “lap 38.1 s” best),
  `·` `#samples` samples `·` loss `#loss` `canvas#spark` 96×16. Right:
  `button#race` (“race it” / “back to training”), `·`, `button#mode` (“ascii” / “3d”),
  `·`, `span#help` (“arrows or wasd to drive” — only shown in race mode).
  Use `flex: 1; min-width: 0` on the left group so it never wraps.
* A one-line note under the caption in About (muted): “The car is driven by a
  small neural network that trains in your browser…”. Keep placeholders marked
  `<!-- TODO -->` for the user's real text.
* Mobile: strip 200 px, hide `#help`, minimap 110×72.

## main.js (integrator)

Owns: renderer, scene, camera, composer (RenderPass → OutputPass → AsciiPass,
ascii **disabled by default**), ResizeObserver on `#strip`, per-track scene
cache (`buildTrackScene` once per track, swap `group`s), per-track `Trainer`
cache, the two cars, modes, input, caption/HUD/minimap, and the loop.

Training mode (default):
* `timeScale = 1.5` (sim runs 1.5× real time; race mode uses 1.0).
* Each frame: steer = trainer.act(state), speed from `autoSpeed`, `stepCar`.
  Every 1 m: `trainer.record(state); trainer.train(2)`.
* `state.off` → attempt ends: `#msg` “Off track · {distance} m”, hold 0.9 s with
  the camera stopped, `trainer.endAttempt({crashed:true,…})`, `trainer.train(150)`,
  `resetToStart`, `#msg` “Attempt {n}”.
* Lap completed → `#msg` “Lap {t} s” (and “first full lap” the first time),
  `trainer.endAttempt({crashed:false, lapTime})`, keep driving (the attempt
  counter keeps counting laps as attempts; `#status` shows best lap).
* Camera: chase behind the focus car, `back 6.8 + 2.0*sf`, `up 2.15`, look
  8 m ahead and 0.35 m up, heading smoothed at 3/s, fov 24 + 5*sf. Sun follows
  the focus car.

Race mode (`#race` click): player car spawns at start on the inside, policy car
alongside (`dOffset ±2.2`), 3-2-1-Go via `#msg` (1 s each), then player input
(arrows/WASD; up = throttle, down = brake, left/right steer with 6/s slew),
policy car uses `trainer.act` + `autoSpeed` (no recording, no training). Two
laps. `#race-hud` shows lap, time and signed gap (positive = you are behind;
compute from s + lap*length difference divided by the player's speed, or simply
“ahead/behind by x m”). Finish: `#msg` result, 3 s, then back to training mode
automatically (or on `#race` click). Cars are ghosts (no collision). Camera
follows the player.

Section switching (`#nav a` click, or hash on load): `#fade.on` → swap track
scene, trainer, reset cars, caption → fade out. Update panels and nav active
state as now; `history.replaceState` the hash; no scroll jump.

Caption, sparkline and minimap update at most 10×/s except the minimap (every
frame). ASCII toggle: `ascii.enabled`, composer at half resolution when on, as
now. Everything must degrade gracefully if `document.fonts` is missing.

## Tests (Node, `node tests/*.mjs`)

* `tests/tracks.test.mjs` — the geometric assertions above, for all five.
* `tests/policy.test.mjs` — expert laps every track; DAgger convergence stats.
Both print a short table and exit non-zero on failure.
