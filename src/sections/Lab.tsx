import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLab, type RunRecord } from '../store/lab';
import { usePlayback } from '../store/playback';
import { useSettings } from '../store/settings';
import { useReducedMotion } from '../hooks/useMotionPref';
import { usePlaybackDriver } from '../hooks/usePlaybackDriver';
import { useRoute, href } from '../lib/router';
import { MATERIALS, type MaterialId } from '../lib/materials';
import { sampleAt, validateParams, type ExperimentParams } from '../lib/physics';
import { hasWebGL } from '../lib/webgl';
import { announce } from '../store/announcer';
import { SceneView } from '../components/lab/SceneView';
import { PlaybackBar } from '../components/lab/PlaybackBar';
import { CameraPresets, LabControls, VisualToggles } from '../components/lab/LabControls';
import { LiveGraphs } from '../components/lab/LiveGraphs';
import { EnergyBar } from '../components/lab/EnergyBar';
import { XRayInspector } from '../components/lab/XRayInspector';
import { ResultCard } from '../components/lab/ResultCard';
import { CompareRuns } from '../components/lab/CompareRuns';
import { Card, CardHeader, SectionHeading, Badge } from '../components/ui/Card';
import { Segmented } from '../components/ui/Controls';
import { Confetti } from '../components/ui/Confetti';
import { Icon } from '../components/ui/Icon';

type Tab = 'setup' | 'show' | 'inspect';

const sameExceptMaterial = (a: ExperimentParams, b: ExperimentParams) =>
  a.wallMm === b.wallMm && a.innerDiameterMm === b.innerDiameterMm && a.magnetStrength === b.magnetStrength && a.dropHeightM === b.dropHeightM;

/** Which material is fastest according to the student's own fair runs (same other settings)? */
export function fastestEvidence(runs: RunRecord[], ref: ExperimentParams) {
  const by = new Map<MaterialId, number[]>();
  for (const r of runs) if (sameExceptMaterial(r.params, ref)) by.set(r.params.material, [...(by.get(r.params.material) ?? []), r.summary.fallTime]);
  if (by.size < 2) return null;
  const avg = [...by.entries()].map(([m, ts]) => [m, ts.reduce((a, b) => a + b, 0) / ts.length] as const).sort((a, b) => a[1] - b[1]);
  return { fastest: avg[0][0], tested: avg.map((x) => x[0]), ranking: avg };
}

function LiveStatus({ material }: { material: MaterialId }) {
  const tc = usePlayback((s) => s.tCoarse);
  const current = useLab((s) => s.current);
  if (!current) return <>Magnet held at the top of a {MATERIALS[material].name.toLowerCase()} tube.</>;
  const s = sampleAt(current, tc);
  return (
    <>
      {MATERIALS[current.params.material].name} tube. Time {s.t.toFixed(2)} seconds, fallen {(s.y * 100).toFixed(0)} centimetres, speed {(s.v * 100).toFixed(0)} centimetres per second, braking force{' '}
      {Math.round(s.current * 100)} percent of weight.
    </>
  );
}

export default function Lab() {
  const route = useRoute();
  const lab = useLab();
  const { params, current, xray, predictions, runs } = lab;
  const lowGraphics = useSettings((s) => s.lowGraphics);
  const advanced = useSettings((s) => s.advanced);
  const reduce = useReducedMotion();
  const playing = usePlayback((s) => s.playing);
  const finishedId = usePlayback((s) => s.finishedId);
  const [tab, setTab] = useState<Tab>('setup');
  const [mode, setMode] = useState<'3d' | '2d'>(hasWebGL() ? '3d' : '2d');
  const [notice, setNotice] = useState<string | null>(hasWebGL() ? null : 'WebGL is not available on this device, so the lab is using the 2D diagram. Everything still works.');
  const [resetToken, setResetToken] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const celebrated = useRef(false);
  const issues = validateParams(params);

  // Deep links from Magneto: #/lab?xray=1 or ?material=aluminium
  useEffect(() => {
    if (route.query.get('xray') === '1') {
      lab.setView({ xray: true, camera: 'xray', showEddy: true, showField: true });
      setTab('inspect');
    }
    const m = route.query.get('material') as MaterialId | null;
    if (m && m in MATERIALS) lab.setParam('material', m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.query.toString()]);

  // Show the trajectory of the last run on first visit (no auto-play).
  useEffect(() => {
    if (!current && lab.currentRunId === null && runs.length) lab.loadRun(runs[runs.length - 1].id);
    usePlayback.setState({ playing: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Changing a setting shows an idle preview of the new setup.
  const preview = useMemo(() => {
    if (current && JSON.stringify(current.params) === JSON.stringify(params)) return current;
    return null;
  }, [current, params]);

  const onFinish = useCallback(() => setShowResult(true), []);
  usePlaybackDriver(preview?.summary.fallTime ?? null, onFinish);

  useEffect(() => {
    if (!finishedId || !preview) return;
    const s = preview.summary;
    announce(`The magnet landed after ${s.fallTime.toFixed(2)} seconds in the ${MATERIALS[preview.params.material].name} tube. Average speed ${(s.avgSpeed * 100).toFixed(0)} centimetres per second.`);
    const ev = fastestEvidence(useLab.getState().runs, preview.params);
    if (ev && predictions.fastest && ev.tested.includes('plastic') && ev.fastest === predictions.fastest && !celebrated.current) {
      celebrated.current = true;
      setConfetti((c) => c + 1);
      announce('Your prediction was correct!');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishedId]);

  const run = useCallback(() => {
    if (validateParams(useLab.getState().params).length) return;
    setShowResult(false);
    const rec = useLab.getState().runExperiment({ source: 'lab' });
    const pb = usePlayback.getState();
    const speed = useLab.getState().xray && pb.speed === 1 ? 0.25 : reduce && pb.speed === 1 ? 0.5 : pb.speed;
    usePlayback.setState({ t: 0, tCoarse: 0, playing: true, speed });
    announce(`Run ${rec.n}: magnet released from the gate at ${speed === 1 ? 'real time' : `${speed} times speed`}.`);
  }, [reduce]);

  // Keyboard shortcuts (ignored while typing or when a control has focus that uses the key).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const k = e.key.toLowerCase();
      if (k === ' ' && (el === document.body || el.id === 'main' || el.dataset.scene)) {
        e.preventDefault();
        const pb = usePlayback.getState();
        if (pb.playing) pb.set({ playing: false });
        else if (useLab.getState().current && pb.t > 0 && pb.t < (useLab.getState().current?.summary.fallTime ?? 0)) pb.set({ playing: true });
        else run();
      } else if (k === 'r') setResetToken((x) => x + 1);
      else if (k === 'x') {
        const on = !useLab.getState().xray;
        useLab.getState().setView({ xray: on, camera: on ? 'xray' : 'side' });
        announce(on ? 'X-ray mode on' : 'X-ray mode off');
      } else if (['1', '2', '3', '4'].includes(k)) {
        const cam = (['side', 'top', 'close', 'xray'] as const)[Number(k) - 1];
        useLab.getState().setView({ camera: cam, xray: cam === 'xray' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run]);

  const ev = preview ? fastestEvidence(runs, preview.params) : null;
  const lastRun = runs.find((r) => r.id === lab.currentRunId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Confetti fire={confetti} />
      <SectionHeading eyebrow="Step 2 · Experiment" title="3D Virtual Lab">
        Pick a tube, drop the magnet from the same gate every time and watch the invisible force. Turn on{' '}
        <button type="button" className="font-semibold text-sage-300 underline underline-offset-4" onClick={() => { lab.setView({ xray: true, camera: 'xray', showEddy: true, showField: true }); setTab('inspect'); }}>
          X-Ray mode
        </button>{' '}
        to see the eddy currents.
      </SectionHeading>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <Card className="relative overflow-hidden p-0">
            <div
              data-scene="1"
              tabIndex={0}
              role="img"
              aria-roledescription="interactive 3D experiment"
              aria-label={`Virtual lab view. Drag to rotate, pinch or scroll to zoom. Keys: Space run or pause, R reset view, X X-ray, 1 to 4 camera presets.`}
              className="relative h-[58vh] min-h-[380px] max-h-[720px] w-full bg-[#1A130F]"
            >
              <SceneView
                params={params}
                trajectory={preview}
                showField={lab.showField}
                showEddy={lab.showEddy}
                showForces={lab.showForces}
                xray={xray}
                camera={lab.camera}
                lowGraphics={lowGraphics}
                reducedMotion={reduce}
                resetToken={resetToken}
                mode={mode}
                onFallback={(r) => {
                  setNotice(r);
                  setMode('2d');
                }}
              />
              <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
                <Badge tone="sage">
                  {MATERIALS[params.material].symbol} · {MATERIALS[params.material].name.split(' ')[0]}
                </Badge>
                {xray && (
                  <Badge tone="field" icon="xray">
                    X-RAY
                  </Badge>
                )}
                {playing && <Badge tone="current">{usePlayback.getState().speed === 1 ? 'LIVE' : `SLOW-MO ${usePlayback.getState().speed}×`}</Badge>}
              </div>
              <ul className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-espresso-950/75 px-3 py-2 text-[11px] text-oat-200 backdrop-blur-sm" aria-label="Legend">
                <li className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-field" aria-hidden />Magnetic field</li>
                <li className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-eddy" aria-hidden />Eddy current</li>
                <li className="flex items-center gap-1.5"><span aria-hidden>↑</span><span className="text-eddy">Braking</span> / <span aria-hidden>↓</span>Weight</li>
                <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-heat/80" aria-hidden />Heat</li>
                {mode === '3d' && <li className="ml-auto text-oat-400">Tube width drawn 5× for visibility</li>}
              </ul>
            </div>
            <p className="sr-only" aria-live="off">
              <LiveStatus material={params.material} />
            </p>
          </Card>

          {notice && (
            <p role="status" className="flex items-start gap-2 rounded-xl border border-field/40 bg-field/10 p-3 text-sm text-oat-100">
              <Icon name="info" size={18} className="mt-0.5 shrink-0 text-field" />
              {notice}
            </p>
          )}

          <Card className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">{mode === '3d' && <CameraPresets onReset={() => setResetToken((x) => x + 1)} />}</div>
              <Segmented
                label="View type"
                size="sm"
                value={mode}
                onChange={(m) => {
                  if (m === '3d' && !hasWebGL()) return;
                  setMode(m);
                  setNotice(null);
                }}
                options={[
                  { value: '3d', label: '3D' },
                  { value: '2d', label: '2D diagram' },
                ]}
              />
            </div>
            <PlaybackBar duration={preview?.summary.fallTime ?? null} onRun={run} canRun={issues.length === 0} />
            {!preview && current && <p className="text-sm text-oat-400">Settings changed. Press <strong className="text-oat-100">Drop the magnet</strong> to test this new setup.</p>}
          </Card>

          <AnimatePresence>
            {showResult && preview && (
              <ResultCard
                trajectory={preview}
                runNumber={lastRun?.n}
                evidence={
                  predictions.fastest ? (
                    ev && ev.tested.includes('plastic') ? (
                      <p className={`flex items-start gap-2 text-sm ${ev.fastest === predictions.fastest ? 'text-success' : 'text-warn'}`}>
                        <Icon name={ev.fastest === predictions.fastest ? 'check' : 'cross'} size={18} className="mt-0.5 shrink-0" />
                        <span>
                          You predicted <strong>{MATERIALS[predictions.fastest].name.split(' ')[0]}</strong> would be fastest. In your fair runs, <strong>{MATERIALS[ev.fastest].name.split(' ')[0]}</strong> was fastest
                          ({ev.ranking.map(([m, t]) => `${MATERIALS[m].symbol} ${t.toFixed(2)} s`).join(' < ')}).{' '}
                          {ev.fastest === predictions.fastest ? 'Your prediction was correct!' : 'Your prediction was not correct. That is how science works: the evidence wins.'}
                        </span>
                      </p>
                    ) : (
                      <p className="text-sm text-oat-300">
                        To check your prediction, test <strong>plastic</strong> and at least one metal with the same other settings.
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-oat-300">
                      Tip: <a href={href('predict')} className="font-semibold text-sage-300 underline">make a prediction</a> first, then check it against your evidence.
                    </p>
                  )
                }
              />
            )}
          </AnimatePresence>
        </div>

        <aside className="space-y-4" aria-label="Lab controls">
          <Card className="p-4 sm:p-5">
            <Segmented<Tab>
              label="Panel"
              hideLabel
              value={tab}
              onChange={setTab}
              options={[
                { value: 'setup', label: 'Setup' },
                { value: 'show', label: 'Visuals' },
                { value: 'inspect', label: 'Inspect' },
              ]}
            />
            <div className="mt-4">
              {tab === 'setup' && <LabControls disabled={playing} />}
              {tab === 'show' && <VisualToggles />}
              {tab === 'inspect' && <XRayInspector trajectory={preview} advanced={advanced} />}
            </div>
            {playing && tab === 'setup' && <p className="mt-3 text-xs text-oat-400">Settings are locked while the magnet is falling.</p>}
          </Card>
          <Card className="p-4 sm:p-5">
            <CardHeader icon="chart" title="Live graphs" />
            <LiveGraphs trajectory={preview} advanced={advanced} />
          </Card>
          <Card className="p-4 sm:p-5">
            <EnergyBar trajectory={preview} />
            {!preview && <p className="text-sm text-oat-400">The energy story appears after a drop.</p>}
          </Card>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="p-4 sm:p-6">
          <CardHeader icon="compare" eyebrow="Fair comparison" title="Compare two runs side by side" />
          <CompareRuns />
        </Card>
        <Card className="space-y-3 p-4 text-sm text-oat-200 sm:p-6">
          <CardHeader icon="info" title="About this simulation" />
          <p>
            This is an <strong className="text-oat-50">educational approximation</strong>. The trends (copper &gt; aluminium &gt; brass &gt; plastic, thicker walls brake more, wider tubes brake less) come from
            established physics. Exact times depend on your real magnet and tube.
          </p>
          <p>Each run adds a small random variation (about ±2.5%), like a slightly tilted magnet in real life. Repeat runs and average them!</p>
          <p>
            Keyboard: <span className="fq-kbd">Space</span> run/pause · <span className="fq-kbd">R</span> reset view · <span className="fq-kbd">X</span> X-ray · <span className="fq-kbd">1</span>–<span className="fq-kbd">4</span> cameras
          </p>
          <a className="inline-flex items-center gap-1 font-semibold text-sage-300 underline underline-offset-4" href={href('learn', { tab: 'limits' })}>
            Read the model's limitations <Icon name="arrowRight" size={16} />
          </a>
        </Card>
      </div>
    </div>
  );
}

