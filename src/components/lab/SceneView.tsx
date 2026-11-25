import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { hasWebGL } from '../../lib/webgl';
import type { ExperimentParams, Trajectory } from '../../lib/physics';
import { sampleAt } from '../../lib/physics';
import type { CameraPreset } from '../../store/lab';
import { usePlayback } from '../../store/playback';
import { TubeDiagram2D } from './TubeDiagram2D';

const LabScene = lazy(() => import('./LabScene'));

class GLBoundary extends Component<{ fallback: ReactNode; children: ReactNode; onError?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** 2D diagram driven by the shared playback clock. */
export function Live2D({ params, trajectory, showField, showEddy, showForces }: { params: ExperimentParams; trajectory: Trajectory | null; showField: boolean; showEddy: boolean; showForces: boolean }) {
  const t = usePlayback((s) => s.t);
  const sample = trajectory ? sampleAt(trajectory, t) : null;
  return (
    <div className="mx-auto h-full max-w-[340px] py-2">
      <TubeDiagram2D params={params} sample={sample} showField={showField} showEddy={showEddy} showForces={showForces} />
    </div>
  );
}

export interface SceneViewProps {
  params: ExperimentParams;
  trajectory: Trajectory | null;
  showField: boolean;
  showEddy: boolean;
  showForces: boolean;
  xray: boolean;
  camera: CameraPreset;
  lowGraphics: boolean;
  reducedMotion: boolean;
  resetToken: number;
  mode: '3d' | '2d';
  onFallback?: (reason: string) => void;
}

const getT = () => usePlayback.getState().t;

/** Shows the 3D scene when possible, otherwise (or on request) the functional 2D diagram. */
export function SceneView(p: SceneViewProps) {
  const [lost, setLost] = useState(false);
  const webgl = hasWebGL();
  const fallback = <Live2D params={p.params} trajectory={p.trajectory} showField={p.showField} showEddy={p.showEddy} showForces={p.showForces} />;
  if (p.mode === '2d' || !webgl || lost) return fallback;
  return (
    <GLBoundary fallback={fallback} onError={() => p.onFallback?.('The 3D view could not start on this device, so the 2D diagram is shown instead.')}>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-oat-300" role="status">
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-sage-400 border-t-transparent" aria-hidden />
            Loading 3D lab…
          </div>
        }
      >
        <LabScene
          params={p.params}
          trajectory={p.trajectory}
          getTime={getT}
          showField={p.showField}
          showEddy={p.showEddy}
          showForces={p.showForces}
          xray={p.xray}
          camera={p.camera}
          lowGraphics={p.lowGraphics}
          reducedMotion={p.reducedMotion}
          resetToken={p.resetToken}
          onContextLost={() => {
            setLost(true);
            p.onFallback?.('The 3D view stopped (graphics memory was reclaimed), so the 2D diagram is shown instead.');
          }}
        />
      </Suspense>
    </GLBoundary>
  );
}
