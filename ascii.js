// ============================================================
//  ascii.js — GPU ASCII post-process. Renders the scene as ink glyphs
//  on paper: dark pixels become dense characters, bright ones blank.
//
//  API: new AsciiPass({ cell, paper, ink, gamma }), setSize(w, h),
//  uniforms.cell, enabled — plus refresh() to re-measure the glyph ramp
//  once web fonts have loaded, and measureRamp() for tests/debug.
// ============================================================
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export const FONT = '"IBM Plex Mono", "SF Mono", Menlo, monospace';
export const CELL_CSS = 5;                 // glyph cell in CSS px (device px = CELL_CSS × dpr)
export const LEVELS = 24;                  // glyphs in the ramp
/** Glyphs the ramp is chosen from (space must be present; it is always level 0). */
export const CANDIDATES = " `.-'_,:;\"^~=!+<>*i|lr/\\()cv?xzjt1fLTJYuo7n{}[]3Ikwa2q4dpbEZ5VU9XhP6mgy8kA&RNGQOW0$B%M#@";
/** Fallback ramp (24 levels, ascending ink) used when the ramp cannot be measured. */
export const RAMP = " .,:;-~=+*lvxzon2Z5XmA&@";

const dpr = () => Math.min((typeof devicePixelRatio === 'number' && devicePixelRatio) || 1, 2);
const GLYPH_PX = 48;  // atlas cell size

function setGlyphFont(ctx, font, cell) {
  ctx.font = `500 ${cell * 0.92}px ${font}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
}

/**
 * Measure the ink coverage of each candidate glyph (drawn exactly as in the atlas),
 * sort by coverage and pick `levels` glyphs at evenly spaced coverage from 0 (space)
 * to the darkest candidate. Browser only (needs a canvas).
 * @returns {{ ramp: string, levels: {ch: string, coverage: number}[], all: {ch: string, coverage: number}[] }}
 */
export function measureRamp(candidates = CANDIDATES, font = FONT, levels = LEVELS, cell = 64) {
  const c = document.createElement('canvas'); c.width = c.height = cell;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const chars = Array.from(new Set(Array.from(candidates)));
  if (!chars.includes(' ')) chars.unshift(' ');
  const all = chars.map((ch) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cell, cell);
    ctx.fillStyle = '#fff'; setGlyphFont(ctx, font, cell);
    ctx.fillText(ch, cell / 2, cell / 2 + cell * 0.04);
    const d = ctx.getImageData(0, 0, cell, cell).data;
    let sum = 0; for (let i = 0; i < d.length; i += 4) sum += d[i];
    return { ch, coverage: ch === ' ' ? 0 : sum / (255 * cell * cell) };
  });
  all.sort((a, b) => a.coverage - b.coverage);
  const max = all[all.length - 1].coverage || 1;
  const chosen = [];
  let lo = 0;
  for (let k = 0; k < levels; k++) {
    const target = (k / (levels - 1)) * max;
    let best = lo;
    for (let i = lo; i < all.length; i++) {
      if (Math.abs(all[i].coverage - target) <= Math.abs(all[best].coverage - target)) best = i; else break;
    }
    chosen.push(all[best]);
    lo = Math.min(best + 1, all.length - 1);
  }
  chosen[0] = { ch: ' ', coverage: 0 };
  return { ramp: chosen.map((e) => e.ch).join(''), levels: chosen, all };
}

function safeRamp(font, levels) {
  try { return measureRamp(CANDIDATES, font, levels).ramp; } catch (e) { return RAMP; }
}

/** One row of glyph cells (white on black) as a mipmapped texture. */
export function makeGlyphAtlas(chars = RAMP, font = FONT, cell = GLYPH_PX) {
  const glyphs = Array.from(chars);
  const c = document.createElement('canvas');
  c.width = cell * glyphs.length; c.height = cell;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#fff'; setGlyphFont(ctx, font, cell);
  for (let i = 0; i < glyphs.length; i++) ctx.fillText(glyphs[i], i * cell + cell / 2, cell / 2 + cell * 0.04);
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true;
  return t;
}

export class AsciiPass extends ShaderPass {
  /**
   * @param {object} o
   * @param {number} [o.cell]   cell size in device px (default 5 CSS px × dpr)
   * @param {number} [o.paper]  background colour
   * @param {number} [o.ink]    glyph colour
   * @param {number} [o.gamma]  darkness curve (>1 = lighter page)
   * @param {string} [o.chars]  explicit ramp (skips measurement)
   * @param {string} [o.font]   CSS font family list for the glyphs
   * @param {number} [o.levels] ramp length when measuring
   */
  constructor({ cell = CELL_CSS * dpr(), paper = 0xf6f4ee, ink = 0x1b1917, gamma = 1.0, chars = null, font = FONT, levels = LEVELS } = {}) {
    const ramp = chars || safeRamp(font, levels);
    super({
      uniforms: {
        tDiffuse: { value: null },
        tGlyphs: { value: makeGlyphAtlas(ramp, font) },
        resolution: { value: new THREE.Vector2(1, 1) },
        cell: { value: cell },
        glyphCount: { value: Array.from(ramp).length },
        gamma: { value: gamma },
        paper: { value: new THREE.Color(paper) },
        ink: { value: new THREE.Color(ink) },
        tint: { value: 0.35 },
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse, tGlyphs;
        uniform vec2 resolution;
        uniform float cell, glyphCount, gamma, tint;
        uniform vec3 paper, ink;
        varying vec2 vUv;
        float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
        void main() {
          vec2 px = vUv * resolution;
          vec2 id = floor(px / cell);
          vec2 cuv = (id + 0.5) * cell / resolution;
          vec2 o = vec2(cell * 0.25) / resolution;
          vec3 c = texture2D(tDiffuse, cuv).rgb
                 + texture2D(tDiffuse, cuv + vec2(o.x, 0.0)).rgb
                 + texture2D(tDiffuse, cuv - vec2(o.x, 0.0)).rgb
                 + texture2D(tDiffuse, cuv + vec2(0.0, o.y)).rgb
                 + texture2D(tDiffuse, cuv - vec2(0.0, o.y)).rgb;
          c /= 5.0;
          float l = luma(c);
          // darkness, with a small dead zone so the paper-coloured sky stays blank
          float d = clamp((0.94 - l) / 0.94, 0.0, 1.0);
          d = pow(d, gamma);
          float idx = floor(d * (glyphCount - 1.0) + 0.5);
          vec2 inCell = fract(px / cell);
          // sample slightly inside the atlas cell so coarse mips do not bleed neighbours in
          vec2 guv = vec2((idx + 0.5 + (inCell.x - 0.5) * 0.92) / glyphCount, inCell.y);
          float g = texture2D(tGlyphs, guv).r;
          // mostly ink, with a whisper of the scene's own colour (kerbs, rain light)
          vec3 col = mix(ink, c, tint * step(0.08, max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b)));
          gl_FragColor = vec4(mix(paper, col, g), 1.0);
        }`,
    });
    this.font = font; this.levels = levels; this.chars = ramp;
  }
  /** Device-pixel size of the output (the final pass renders at full canvas resolution). */
  setSize(w, h) { this.uniforms.resolution.value.set(w, h); }
  /** Swap the glyph ramp (and atlas); glyphCount follows. */
  setRamp(chars, font = this.font) {
    const old = this.uniforms.tGlyphs.value;
    this.chars = chars; this.font = font;
    this.uniforms.tGlyphs.value = makeGlyphAtlas(chars, font);
    this.uniforms.glyphCount.value = Array.from(chars).length;
    if (old) old.dispose();
  }
  /** Re-measure the ramp with the (now loaded) font and rebuild the atlas. */
  refresh(font = this.font) { this.setRamp(safeRamp(font, this.levels), font); }
  dispose() { super.dispose(); if (this.uniforms.tGlyphs.value) this.uniforms.tGlyphs.value.dispose(); }
}
