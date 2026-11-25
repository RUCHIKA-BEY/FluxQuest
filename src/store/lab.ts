import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MaterialId } from '../lib/materials';
import { DEFAULT_PARAMS, simulate, type ExperimentParams, type RunSummary, type Trajectory, type VariableKey } from '../lib/physics';
import { newSeed } from '../lib/random';

export type Direction = 'slower' | 'faster' | 'same';

export interface RunRecord {
  id: string;
  n: number;
  createdAt: number;
  source: 'lab' | 'variables';
  params: ExperimentParams;
  seed: number;
  summary: Pick<RunSummary, 'fallTime' | 'avgSpeed' | 'brakingCoefficient' | 'slowdownFactor' | 'heatFraction' | 'brakingLabel' | 'terminalSpeed'>;
  /** Variable Lab: which variable was changed against the baseline. */
  changed?: VariableKey;
  baselineId?: string;
  prediction?: { choice: Direction; outcome: Direction; correct: boolean };
}

export interface Predictions {
  fastest?: MaterialId;
  why?: string;
  thickness?: Direction;
  diameter?: Direction;
  savedAt?: number;
}

export type CameraPreset = 'side' | 'top' | 'close' | 'xray';

interface LabState {
  params: ExperimentParams;
  runs: RunRecord[];
  predictions: Predictions;
  /** Not persisted: the trajectory being shown. */
  current: Trajectory | null;
  currentRunId: string | null;
  showField: boolean;
  showEddy: boolean;
  showForces: boolean;
  xray: boolean;
  camera: CameraPreset;
  compare: [string | null, string | null];

  setParam: <K extends keyof ExperimentParams>(key: K, value: ExperimentParams[K]) => void;
  setParams: (p: ExperimentParams) => void;
  /** Runs a new trial with fresh variation and stores it in the log. */
  runExperiment: (opts?: Partial<Pick<RunRecord, 'source' | 'changed' | 'baselineId' | 'prediction'>> & { params?: ExperimentParams }) => RunRecord;
  loadRun: (id: string) => void;
  updateRun: (id: string, patch: Partial<RunRecord>) => void;
  clearRuns: () => void;
  setPredictions: (p: Predictions) => void;
  setView: (patch: Partial<Pick<LabState, 'showField' | 'showEddy' | 'showForces' | 'xray' | 'camera' | 'compare'>>) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const useLab = create<LabState>()(
  persist(
    (set, get) => ({
      params: DEFAULT_PARAMS,
      runs: [],
      predictions: {},
      current: null,
      currentRunId: null,
      showField: true,
      showEddy: true,
      showForces: true,
      xray: false,
      camera: 'side',
      compare: [null, null],

      setParam: (key, value) => set((s) => ({ params: { ...s.params, [key]: value } })),
      setParams: (p) => set({ params: { ...p } }),

      runExperiment: (opts = {}) => {
        const params = opts.params ?? get().params;
        const seed = newSeed();
        const traj = simulate(params, seed);
        const runs = get().runs;
        const rec: RunRecord = {
          id: uid(),
          n: (runs[runs.length - 1]?.n ?? 0) + 1,
          createdAt: Date.now(),
          source: opts.source ?? 'lab',
          params: { ...params },
          seed,
          summary: {
            fallTime: traj.summary.fallTime,
            avgSpeed: traj.summary.avgSpeed,
            brakingCoefficient: traj.summary.brakingCoefficient,
            slowdownFactor: traj.summary.slowdownFactor,
            heatFraction: traj.summary.heatFraction,
            brakingLabel: traj.summary.brakingLabel,
            terminalSpeed: traj.summary.terminalSpeed,
          },
          changed: opts.changed,
          baselineId: opts.baselineId,
          prediction: opts.prediction,
        };
        // keep the log bounded for low-end devices
        set({ runs: [...runs, rec].slice(-200), current: traj, currentRunId: rec.id });
        return rec;
      },

      loadRun: (id) => {
        const r = get().runs.find((x) => x.id === id);
        if (!r) return;
        set({ current: simulate(r.params, r.seed), currentRunId: r.id, params: { ...r.params } });
      },
      updateRun: (id, patch) => set((s) => ({ runs: s.runs.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      clearRuns: () => set({ runs: [], current: null, currentRunId: null, compare: [null, null] }),
      setPredictions: (p) => set({ predictions: { ...get().predictions, ...p } }),
      setView: (patch) => set(patch),
    }),
    {
      name: 'fq-lab',
      version: 1,
      partialize: (s) => ({
        params: s.params,
        runs: s.runs,
        predictions: s.predictions,
        showField: s.showField,
        showEddy: s.showEddy,
        showForces: s.showForces,
      }),
    },
  ),
);
