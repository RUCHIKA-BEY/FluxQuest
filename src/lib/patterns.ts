import type { RunRecord, Direction, Predictions } from '../store/lab';
import { MATERIALS, type MaterialId } from './materials';
import { PARAM_LIMITS, VARIABLE_LABELS, type ExperimentParams, type NumericParam, type VariableKey } from './physics';

const KEYS: VariableKey[] = ['material', 'wallMm', 'innerDiameterMm', 'magnetStrength', 'dropHeightM'];

export function differingKeys(a: ExperimentParams, b: ExperimentParams): VariableKey[] {
  return KEYS.filter((k) => a[k] !== b[k]);
}

/** Pairs of runs that differ in exactly one variable `key` (fair comparisons). */
export function fairPairs(runs: RunRecord[], key: VariableKey) {
  const out: [RunRecord, RunRecord][] = [];
  for (let i = 0; i < runs.length; i++)
    for (let j = i + 1; j < runs.length; j++) {
      const d = differingKeys(runs[i].params, runs[j].params);
      if (d.length === 1 && d[0] === key) out.push([runs[i], runs[j]]);
    }
  return out;
}

/** Effect of INCREASING a numeric variable on fall time, from the student's own fair pairs. */
export function effectOf(runs: RunRecord[], key: NumericParam): { direction: Direction; pairs: number; meanRatio: number } | null {
  const pairs = fairPairs(runs, key);
  if (!pairs.length) return null;
  let logSum = 0;
  for (const [a, b] of pairs) {
    const [lo, hi] = a.params[key] < b.params[key] ? [a, b] : [b, a];
    logSum += Math.log(hi.summary.fallTime / lo.summary.fallTime);
  }
  const meanRatio = Math.exp(logSum / pairs.length);
  const direction: Direction = meanRatio > 1.05 ? 'slower' : meanRatio < 0.95 ? 'faster' : 'same';
  return { direction, pairs: pairs.length, meanRatio };
}

/** Average fall time per material among runs that share all other settings with the most-tested setup. */
export function materialRanking(runs: RunRecord[]) {
  const groups = new Map<string, RunRecord[]>();
  for (const r of runs) {
    const key = `${r.params.wallMm}|${r.params.innerDiameterMm}|${r.params.magnetStrength}|${r.params.dropHeightM}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  let best: RunRecord[] = [];
  for (const g of groups.values()) {
    const mats = new Set(g.map((r) => r.params.material)).size;
    if (mats > new Set(best.map((r) => r.params.material)).size) best = g;
  }
  const by = new Map<MaterialId, number[]>();
  for (const r of best) by.set(r.params.material, [...(by.get(r.params.material) ?? []), r.summary.fallTime]);
  if (by.size < 2) return null;
  return [...by.entries()].map(([m, ts]) => ({ material: m, mean: ts.reduce((a, b) => a + b, 0) / ts.length, n: ts.length })).sort((a, b) => a.mean - b.mean);
}

export interface PredictionCheck {
  question: string;
  predicted: string;
  evidence: string | null;
  correct: boolean | null;
}

const dirWord: Record<Direction, string> = { slower: 'falls more slowly', faster: 'falls faster', same: 'makes no real difference' };

export function checkPredictions(p: Predictions, runs: RunRecord[]): PredictionCheck[] {
  const out: PredictionCheck[] = [];
  const rank = materialRanking(runs);
  if (p.fastest) {
    const ok = rank && rank.some((r) => r.material === 'plastic') ? rank[0].material : null;
    out.push({
      question: 'Which tube lets the magnet fall fastest?',
      predicted: MATERIALS[p.fastest].name,
      evidence: ok ? `${MATERIALS[ok].name} was fastest (${rank!.map((r) => `${MATERIALS[r.material].symbol} ${r.mean.toFixed(2)} s`).join(' < ')})` : null,
      correct: ok ? ok === p.fastest : null,
    });
  }
  for (const [key, pred, q] of [
    ['wallMm', p.thickness, 'Thicker tube wall?'],
    ['innerDiameterMm', p.diameter, 'Wider internal diameter?'],
  ] as const) {
    if (!pred) continue;
    const e = effectOf(runs, key);
    out.push({
      question: q,
      predicted: `The magnet ${dirWord[pred]}`,
      evidence: e ? `Increasing ${VARIABLE_LABELS[key].toLowerCase()} → magnet ${dirWord[e.direction]} (×${e.meanRatio.toFixed(2)} fall time, ${e.pairs} fair pair${e.pairs > 1 ? 's' : ''})` : null,
      correct: e ? e.direction === pred : null,
    });
  }
  return out;
}

/** Plain-language patterns from the student's evidence. */
export function describePatterns(runs: RunRecord[]): string[] {
  const out: string[] = [];
  const rank = materialRanking(runs);
  if (rank) {
    out.push(
      `Material: ${rank.map((r) => MATERIALS[r.material].name.split(' ')[0]).join(' → ')} (fastest to slowest). ` +
        (rank[rank.length - 1].material === 'copper' ? 'Copper conducts best, so it carries the strongest eddy currents and brakes hardest.' : 'Better conductors carry bigger eddy currents and brake harder.'),
    );
  }
  const notes: Record<NumericParam, (d: Direction) => string> = {
    wallMm: (d) => (d === 'slower' ? 'Thicker walls give more metal for eddy currents, so braking is stronger. Each extra millimetre helps a little less.' : 'Wall thickness did not behave as expected; repeat the trials.'),
    innerDiameterMm: (d) => (d === 'faster' ? 'A wider bore puts the metal further from the magnet, where its field is much weaker, so braking drops sharply.' : 'Diameter did not behave as expected; repeat the trials.'),
    magnetStrength: (d) => (d === 'slower' ? 'A stronger magnet induces bigger currents AND feels a bigger push, so braking grows quickly (about with strength²).' : 'Strength did not behave as expected; repeat.'),
    dropHeightM: () => 'A taller drop takes longer, but in metal tubes the magnet soon reaches a steady terminal speed, so time grows almost in proportion to height.',
  };
  for (const key of Object.keys(PARAM_LIMITS) as NumericParam[]) {
    const e = effectOf(runs, key);
    if (e) out.push(`${VARIABLE_LABELS[key]}: increasing it → magnet ${dirWord[e.direction]} (fall time ×${e.meanRatio.toFixed(2)}). ${notes[key](e.direction)}`);
  }
  return out;
}
