/**
 * FluxQuest physics engine: an educational approximation of a magnet falling through a tube.
 *
 * Model: a magnetic dipole falls along the axis of a cylindrical tube.
 *   m dv/dt = m g − k(z) v − c_air v²
 * The braking coefficient extends the point-dipole thin-wall result of
 * Levin, da Silveira & Rizzato, Am. J. Phys. 74, 815 (2006):
 *   k_thin = 45 μ0² μ² σ w / (1024 a⁴)
 * to a thick wall by integrating thin shells across the wall:
 *   k = η · (45 μ0² μ² σ / 1024) · (a_in⁻³ − a_out⁻³) / 3
 * η is a finite-size correction (a real magnet is not a point and nearly fills the bore).
 * It is a PROJECT ASSUMPTION, calibrated so a standard copper tube gives terminal speeds
 * of a few tens of cm/s, which matches typical classroom observations. It is not a measured constant.
 */
import { MATERIALS, type MaterialId } from './materials';
import { gaussian, mulberry32 } from './random';

export const G = 9.81;
export const MU0 = 4e-7 * Math.PI;

/** The same magnet is used in every experiment (fair test), only "strength" can be changed deliberately. */
export const MAGNET = {
  diameterMm: 12,
  lengthMm: 12,
  massKg: 0.0102, // 12 mm × 12 mm NdFeB cylinder ≈ 10 g
  dipoleMoment: 1.29, // A·m², about Br ≈ 1.2 T × volume / μ0
} as const;

/** Finite-size correction (project assumption, see header). */
export const ETA = 0.16;
/** Air drag coefficient c_air = ½ ρ C_d A for the magnet (tiny, kept for honesty). */
const C_AIR = 0.5 * 1.2 * 1.0 * Math.PI * (MAGNET.diameterMm / 2000) ** 2;

export interface ExperimentParams {
  material: MaterialId;
  /** Wall thickness in millimetres (0.5–4). */
  wallMm: number;
  /** Internal diameter in millimetres (13–30, must exceed the magnet's 12 mm). */
  innerDiameterMm: number;
  /** Multiplier of the standard magnet's dipole moment (0.5–1.5). */
  magnetStrength: number;
  /** Drop distance in metres = tube length (0.3–1.5). */
  dropHeightM: number;
}

export const DEFAULT_PARAMS: ExperimentParams = {
  material: 'copper',
  wallMm: 1.5,
  innerDiameterMm: 16,
  magnetStrength: 1,
  dropHeightM: 1,
};

export const PARAM_LIMITS = {
  wallMm: { min: 0.5, max: 4, step: 0.5, unit: 'mm', label: 'Wall thickness' },
  innerDiameterMm: { min: 13, max: 30, step: 1, unit: 'mm', label: 'Internal diameter' },
  magnetStrength: { min: 0.5, max: 1.5, step: 0.25, unit: '×', label: 'Magnet strength' },
  dropHeightM: { min: 0.3, max: 1.5, step: 0.1, unit: 'm', label: 'Drop height' },
} as const;

export type NumericParam = keyof typeof PARAM_LIMITS;
export type VariableKey = 'material' | NumericParam;

export const VARIABLE_LABELS: Record<VariableKey, string> = {
  material: 'Tube material',
  wallMm: 'Wall thickness',
  innerDiameterMm: 'Internal diameter',
  magnetStrength: 'Magnet strength',
  dropHeightM: 'Drop height',
};

export interface Sample {
  /** time (s) */ t: number;
  /** distance fallen from the release point (m) */ y: number;
  /** speed (m/s, downward positive) */ v: number;
  /** acceleration (m/s²) */ a: number;
  /** braking force (N) */ fBrake: number;
  /** power dissipated as heat in the tube (W) */ power: number;
  /** cumulative heat (J) */ heat: number;
  /** kinetic energy (J) */ ke: number;
  /** induced-current intensity, 0 … ~1 (braking force / weight) for visuals */ current: number;
}

export interface RunSummary {
  fallTime: number;
  freeFallTime: number;
  finalSpeed: number;
  terminalSpeed: number; // mg / k0 (∞ for plastic)
  avgSpeed: number;
  /** k0 in N·s/m */
  brakingCoefficient: number;
  /** fallTime / freeFallTime */
  slowdownFactor: number;
  /** fraction of lost potential energy that became heat (0–1) */
  heatFraction: number;
  peakBrakeOverWeight: number;
  timeConstant: number; // τ = m / k0
  brakingLabel: BrakingLabel;
}

export type BrakingLabel = 'none' | 'weak' | 'moderate' | 'strong' | 'very strong';

export interface Trajectory {
  params: ExperimentParams;
  seed: number;
  samples: Sample[];
  summary: RunSummary;
}

const mm = (x: number) => x / 1000;

export function validateParams(p: ExperimentParams): string[] {
  const issues: string[] = [];
  if (p.innerDiameterMm <= MAGNET.diameterMm)
    issues.push(`The internal diameter must be larger than the magnet (${MAGNET.diameterMm} mm) or it will not fit.`);
  for (const key of Object.keys(PARAM_LIMITS) as NumericParam[]) {
    const lim = PARAM_LIMITS[key];
    if (p[key] < lim.min || p[key] > lim.max) issues.push(`${lim.label} must be between ${lim.min} and ${lim.max} ${lim.unit}.`);
  }
  return issues;
}

/** Ideal braking coefficient k0 (N·s/m) deep inside the tube, before trial-to-trial variation. */
export function brakingCoefficient(p: ExperimentParams): number {
  const sigma = MATERIALS[p.material].conductivity;
  if (sigma <= 0) return 0;
  const aIn = mm(p.innerDiameterMm) / 2;
  const aOut = aIn + mm(p.wallMm);
  const mu = MAGNET.dipoleMoment * p.magnetStrength;
  const geometry = (aIn ** -3 - aOut ** -3) / 3;
  return ETA * ((45 * MU0 ** 2 * mu ** 2 * sigma) / 1024) * geometry;
}

export function brakingLabel(k: number): BrakingLabel {
  const vt = k > 0 ? (MAGNET.massKg * G) / k : Infinity;
  if (k === 0) return 'none';
  if (vt > 2) return 'weak';
  if (vt > 0.5) return 'moderate';
  if (vt > 0.12) return 'strong';
  return 'very strong';
}

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Braking reduces near the open ends of the tube (fewer conducting rings on one side). */
export function endFactor(y: number, L: number, innerDiameterMm: number) {
  const d = Math.min(y, L - y);
  const ramp = mm(innerDiameterMm) + mm(MAGNET.lengthMm);
  return 0.5 + 0.5 * smoothstep(0, ramp, Math.max(0, d));
}

export function freeFallTime(h: number) {
  return Math.sqrt((2 * h) / G);
}

/**
 * Simulate one drop. Deterministic for a given (params, seed).
 * @param variation set to false for the "ideal" curve (no trial noise).
 */
export function simulate(p: ExperimentParams, seed = 1, variation = true): Trajectory {
  const rand = mulberry32(seed);
  const k0Ideal = brakingCoefficient(p);
  const kNoise = variation ? 1 + 0.025 * gaussian(rand) : 1;
  const airNoise = variation ? 1 + 0.015 * gaussian(rand) : 1;
  const k0 = Math.max(0, k0Ideal * kNoise);
  const cAir = C_AIR * airNoise;
  const m = MAGNET.massKg;
  const L = p.dropHeightM;
  const weight = m * G;

  // Choose a sample interval so long runs stay light (≤ ~1500 samples).
  const vt = k0 > 0 ? weight / k0 : Infinity;
  const estT = Number.isFinite(vt) ? Math.max(freeFallTime(L), L / vt + (2 * m) / k0) : freeFallTime(L);
  const sampleDt = Math.max(0.005, estT / 1500);
  const dt = Math.min(0.001, sampleDt / 2);
  const tMax = 900;

  const samples: Sample[] = [];
  let t = 0;
  let y = 0;
  let v = 0;
  let heat = 0;
  let nextSample = 0;
  let peakRatio = 0;

  const record = (fB: number, a: number) => {
    samples.push({ t, y: Math.min(y, L), v, a, fBrake: fB, power: fB * v, heat, ke: 0.5 * m * v * v, current: Math.min(1.2, fB / weight) });
  };

  while (y < L && t < tMax) {
    const k = k0 * endFactor(y, L, p.innerDiameterMm);
    const fB = k * v;
    const a = G - (fB + cAir * v * v) / m;
    if (t >= nextSample) {
      record(fB, a);
      nextSample += sampleDt;
    }
    peakRatio = Math.max(peakRatio, fB / weight);
    // semi-implicit Euler
    v += a * dt;
    const yPrev = y;
    y += v * dt;
    heat += k * v * v * dt;
    t += dt;
    if (y >= L) {
      // interpolate the exact crossing time for a clean fall time
      const frac = (L - yPrev) / (y - yPrev);
      t = t - dt + frac * dt;
      y = L;
    }
  }
  const kEnd = k0 * endFactor(L, L, p.innerDiameterMm);
  record(kEnd * v, G - (kEnd * v + cAir * v * v) / m);

  const fallTime = t;
  const ff = freeFallTime(L);
  const pe = weight * L;
  const summary: RunSummary = {
    fallTime,
    freeFallTime: ff,
    finalSpeed: v,
    terminalSpeed: vt,
    avgSpeed: L / fallTime,
    brakingCoefficient: k0,
    slowdownFactor: fallTime / ff,
    heatFraction: Math.min(1, heat / pe),
    peakBrakeOverWeight: peakRatio,
    timeConstant: k0 > 0 ? m / k0 : Infinity,
    brakingLabel: brakingLabel(k0Ideal),
  };
  return { params: { ...p }, seed, samples, summary };
}

/** Sample at an arbitrary time with linear interpolation (for smooth playback). */
export function sampleAt(traj: Trajectory, t: number): Sample {
  const s = traj.samples;
  if (t <= 0) return s[0];
  if (t >= s[s.length - 1].t) return s[s.length - 1];
  // binary search
  let lo = 0;
  let hi = s.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (s[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = s[lo];
  const b = s[hi];
  const f = (t - a.t) / (b.t - a.t || 1);
  const lerp = (x: number, z: number) => x + (z - x) * f;
  return {
    t,
    y: lerp(a.y, b.y),
    v: lerp(a.v, b.v),
    a: lerp(a.a, b.a),
    fBrake: lerp(a.fBrake, b.fBrake),
    power: lerp(a.power, b.power),
    heat: lerp(a.heat, b.heat),
    ke: lerp(a.ke, b.ke),
    current: lerp(a.current, b.current),
  };
}

/** Downsample for charts (keeps first and last). */
export function downsample(traj: Trajectory, n = 120): Sample[] {
  const s = traj.samples;
  if (s.length <= n) return s;
  const out: Sample[] = [];
  for (let i = 0; i < n; i++) out.push(s[Math.round((i / (n - 1)) * (s.length - 1))]);
  return out;
}

/**
 * Magnetic flux of an on-axis dipole through a coaxial ring of radius a at axial distance d (Wb).
 * Φ = μ0 μ a² / (2 (a² + d²)^{3/2}). Used by X-ray inspection to quote the changing flux.
 */
export function ringFlux(mu: number, a: number, d: number) {
  return (MU0 * mu * a * a) / (2 * (a * a + d * d) ** 1.5);
}

export interface XRayReadout {
  fluxAhead: number; // Wb through a ring one magnet-length below
  fluxRateAhead: number; // Wb/s (positive = increasing)
  fluxRateBehind: number; // Wb/s (negative = decreasing)
  emfAhead: number; // V around that ring (magnitude)
  brakeOverWeight: number;
}

export function xrayReadout(p: ExperimentParams, s: Sample): XRayReadout {
  const mu = MAGNET.dipoleMoment * p.magnetStrength;
  const a = mm(p.innerDiameterMm) / 2 + mm(p.wallMm) / 2;
  const d = mm(MAGNET.lengthMm);
  const dPhi_dd = (3 * MU0 * mu * a * a * d) / (2 * (a * a + d * d) ** 2.5);
  const rate = dPhi_dd * s.v; // gap to the ring ahead shrinks → flux grows
  return {
    fluxAhead: ringFlux(mu, a, d),
    fluxRateAhead: rate,
    fluxRateBehind: -rate,
    emfAhead: Math.abs(rate),
    brakeOverWeight: s.fBrake / (MAGNET.massKg * G),
  };
}
