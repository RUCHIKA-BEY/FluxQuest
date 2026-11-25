import { useLab } from '../store/lab';
import { MATERIALS } from '../lib/materials';
import type { ExperimentParams } from '../lib/physics';

/** Compact, privacy-safe snapshot of the student's experiment state (numbers only) sent with each question. */
export interface ExperimentSnapshot {
  params: ExperimentParams;
  lastRun?: { material: string; fallTime: number; avgSpeed: number; terminalSpeed: number | null; params: ExperimentParams };
  recentRuns: { n: number; material: string; wallMm: number; innerDiameterMm: number; magnetStrength: number; dropHeightM: number; fallTime: number }[];
  predictions: { fastest?: string; thickness?: string; diameter?: string };
  runCount: number;
}

export function snapshot(): ExperimentSnapshot {
  const s = useLab.getState();
  const last = s.runs[s.runs.length - 1];
  return {
    params: s.params,
    lastRun: last
      ? {
          material: MATERIALS[last.params.material].name,
          fallTime: +last.summary.fallTime.toFixed(3),
          avgSpeed: +last.summary.avgSpeed.toFixed(3),
          terminalSpeed: Number.isFinite(last.summary.terminalSpeed) ? +last.summary.terminalSpeed.toFixed(3) : null,
          params: last.params,
        }
      : undefined,
    recentRuns: s.runs.slice(-8).map((r) => ({
      n: r.n,
      material: r.params.material,
      wallMm: r.params.wallMm,
      innerDiameterMm: r.params.innerDiameterMm,
      magnetStrength: r.params.magnetStrength,
      dropHeightM: r.params.dropHeightM,
      fallTime: +r.summary.fallTime.toFixed(3),
    })),
    predictions: { fastest: s.predictions.fastest, thickness: s.predictions.thickness, diameter: s.predictions.diameter },
    runCount: s.runs.length,
  };
}
