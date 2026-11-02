# aniketmittal.com

A personal website with a masthead you can race. The strip at the top is a
black open-wheel car lapping a real Formula 1 circuit, scaled to about 1:4,
rendered in 3D (with an optional ASCII pass drawn by a fragment shader).
Each of the five sections has its own circuit: Silverstone (About), Spa
(Projects), Monza (Experience), Interlagos (Hobbies) and Monaco (Contact).

The car is driven by a 1,441-parameter neural network (2×32 tanh MLP) that
trains in the visitor's browser, on the CPU, by on-policy imitation (DAgger):
it drives, goes off, resets, trains on what it saw, and tries again until it
can lap, then keeps improving. Each circuit gets a fresh driver. The attempt
counter, sample count and loss in the caption are real.

Press **race it** to drive a second, white car against the policy for two
laps (arrows or WASD; up = throttle, down = brake).

No build step. Three.js is loaded from a CDN via an import map.

## Run it

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Any static host works (GitHub Pages, Netlify, Vercel).

## Check it

```bash
node tests/*.mjs
```

`tests/tracks.test.mjs` checks the circuit geometry (lap length, curvature,
no self-intersection, projection); `tests/policy.test.mjs` checks that the
expert laps every circuit and that the DAgger driver converges within a few
attempts for most seeds. Both print a short table and exit non-zero on failure.

## Edit the content

Everything personal is in `index.html`, marked with `<!-- TODO -->`:

- the About paragraph and photo (`.photo` → drop in an `<img>`),
- the Projects list (one `<li>` per project; thumbnails are `<img class="thumb">`),
- Experience and Education entries,
- Hobbies prose and Contact links.

Sections are the five `<section class="panel">` blocks; each is tied to a
circuit in `tracks.js` (`TRACKS`, in section order). To add one, add a panel,
a nav link with the next `data-i`, and a track definition.

## Files

- `index.html`, `style.css` — the page. Set in Newsreader and IBM Plex Mono.
- `docs/DESIGN.md` — the interface contract between the modules.
- `tracks.js` — the five circuits as closed Catmull-Rom loops, resampled at 1 m, with `pose`, `curvAt` and `project`.
- `physics.js` — kinematic bicycle car, the speed controller and the pure-pursuit expert.
- `policy.js` — the MLP (Adam) and the DAgger `Trainer`.
- `car.js` — the procedural open-wheel car and its two liveries.
- `world.js` — the circuit scene (grass, asphalt, kerbs, barriers, banners), lighting and the minimap.
- `ascii.js` — the ASCII post-process (glyph atlas + fragment shader). Toggle with the `ascii` link in the caption.
- `main.js` — the integrator: renderer, camera, training and race modes, input, caption, HUD and the loop.
- `tests/` — Node checks for the tracks and the driver.

## Tuning the driver

In `policy.js`: `lr` and `initScale` (Trainer options) control how quickly
it learns and how badly it drives before training; `main.js` records a sample
and takes two Adam steps every metre, plus a 150-step burst after each
off-track excursion. `physics.js` holds the car limits (`CAR`) and the
expert's speed margins (`SPEED`).
