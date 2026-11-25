import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, ComposedChart, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import { useLab, type Direction, type RunRecord } from '../store/lab';
import { useRoute, navigate, href } from '../lib/router';
import { MATERIALS, MATERIAL_ORDER, type MaterialId } from '../lib/materials';
import { DEFAULT_PARAMS, PARAM_LIMITS, VARIABLE_LABELS, sampleAt, simulate, validateParams, type ExperimentParams, type NumericParam, type VariableKey } from '../lib/physics';
import { differingKeys } from '../lib/patterns';
import { fmtSpeed } from '../lib/format';
import { announce } from '../store/announcer';
import { useReducedMotion } from '../hooks/useMotionPref';
import { Card, CardHeader, SectionHeading, Badge } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Segmented, Slider } from '../components/ui/Controls';
import { Icon } from '../components/ui/Icon';
import { Confetti } from '../components/ui/Confetti';
import { TubeDiagram2D } from '../components/lab/TubeDiagram2D';
import { MaterialPicker, fmtParam } from '../components/lab/LabControls';

const VARS: VariableKey[] = ['material', 'wallMm', 'innerDiameterMm', 'magnetStrength', 'dropHeightM'];

const REFLECT: Record<VariableKey, string> = {
  material: 'Copper, aluminium and brass are all non-magnetic metals. What property of the material seems to decide how strongly it brakes the magnet?',
  wallMm: 'Doubling the wall thickness did not double the fall time. Why might extra metal far from the magnet help less?',
  innerDiameterMm: 'Why would moving the tube wall further away from the magnet weaken the braking so much?',
  magnetStrength: 'A stronger magnet makes bigger currents. Why does it also feel a bigger push from them? (Hint: two effects multiply.)',
  dropHeightM: 'Is the fall time exactly proportional to height? Look at the start of the fall. What happens before the magnet reaches its steady speed?',
};

const fmtVal = (key: VariableKey, p: ExperimentParams) =>
  key === 'material' ? MATERIALS[p.material].name.split(' ')[0] : `${fmtParam[key as NumericParam](p[key as NumericParam])} ${PARAM_LIMITS[key as NumericParam].unit}`;

function outcomeOf(base: number, t: number): Direction {
  const r = t / base;
  return r > 1.05 ? 'slower' : r < 0.95 ? 'faster' : 'same';
}

function MiniDrop({ run, onDone }: { run: RunRecord; onDone: () => void }) {
  const traj = useMemo(() => simulate(run.params, run.seed), [run]);
  const reduce = useReducedMotion();
  const [t, setT] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const speed = reduce ? 0.5 : 1;
    const tick = (now: number) => {
      const dt = ((now - last) / 1000) * speed;
      last = now;
      setT((x) => {
        const n = x + dt;
        if (n >= traj.summary.fallTime) {
          setDone(true);
          return traj.summary.fallTime;
        }
        raf = requestAnimationFrame(tick);
        return n;
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [traj, reduce]);
  useEffect(() => {
    if (done) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
  return (
    <div className="flex items-center gap-4">
      <div className="h-64 w-32 shrink-0">
        <TubeDiagram2D compact params={run.params} sample={sampleAt(traj, t)} showForces={false} title="Mini drop" />
      </div>
      <div>
        <p className="font-display text-4xl font-bold tabular text-oat-50">{t.toFixed(2)} s</p>
        <p className="text-sm text-oat-300">{done ? 'Landed!' : 'Falling…'}</p>
        {!done && (
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setT(traj.summary.fallTime)}>
            Skip to result
          </Button>
        )}
      </div>
    </div>
  );
}

export default function VariableLab() {
  const route = useRoute();
  const { runs, runExperiment, clearRuns } = useLab();
  const [key, setKey] = useState<VariableKey>(() => {
    const v = route.query.get('var') as VariableKey | null;
    return v && VARS.includes(v) ? v : 'material';
  });
  useEffect(() => {
    const v = route.query.get('var') as VariableKey | null;
    if (v && VARS.includes(v)) setKey(v);
  }, [route.query]);

  const [baseline, setBaseline] = useState<ExperimentParams>(DEFAULT_PARAMS);
  const [testValue, setTestValue] = useState<ExperimentParams>(DEFAULT_PARAMS);
  const [prediction, setPrediction] = useState<Direction | null>(null);
  const [active, setActive] = useState<RunRecord | null>(null);
  const [showOutcome, setShowOutcome] = useState(false);
  const [editBase, setEditBase] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [reflection, setReflection] = useState('');

  useEffect(() => {
    setTestValue(baseline);
    setPrediction(null);
    setActive(null);
    setShowOutcome(false);
  }, [key, baseline]);

  const series = runs.filter((r) => {
    if (r.source !== 'variables' || r.changed !== key) return false;
    const d = differingKeys(r.params, baseline);
    return d.length === 0 || (d.length === 1 && d[0] === key);
  });
  const baselineRuns = series.filter((r) => differingKeys(r.params, baseline).length === 0);
  const baseTime = baselineRuns.length ? baselineRuns.reduce((a, r) => a + r.summary.fallTime, 0) / baselineRuns.length : null;
  const testIsBaseline = differingKeys(testValue, baseline).length === 0;
  const issues = validateParams(testValue);

  const doRun = () => {
    let bt = baseTime;
    if (bt === null) {
      // Always measure the baseline first so there is something fair to compare against.
      const b = runExperiment({ source: 'variables', changed: key, params: baseline });
      bt = b.summary.fallTime;
    }
    const rec = runExperiment({ source: 'variables', changed: key, params: testValue });
    if (prediction && !testIsBaseline) {
      const outcome = outcomeOf(bt, rec.summary.fallTime);
      const correct = outcome === prediction;
      useLab.getState().updateRun(rec.id, { prediction: { choice: prediction, outcome, correct } });
      rec.prediction = { choice: prediction, outcome, correct };
    }
    setShowOutcome(false);
    setActive(rec);
    announce(`Testing ${VARIABLE_LABELS[key]} at ${fmtVal(key, testValue)}. Magnet released.`);
  };

  const onLanded = () => {
    if (!active) return;
    setShowOutcome(true);
    const p = active.prediction;
    announce(`Fall time ${active.summary.fallTime.toFixed(2)} seconds.${p ? (p.correct ? ' Your prediction was correct!' : ' Your prediction did not match the result.') : ''}`);
    if (p?.correct) setConfetti((c) => c + 1);
  };

  const chartData = useMemo(() => {
    if (key === 'material') {
      return MATERIAL_ORDER.map((m) => {
        const rs = series.filter((r) => r.params.material === m);
        return rs.length ? { name: MATERIALS[m].symbol, material: m, time: +(rs.reduce((a, r) => a + r.summary.fallTime, 0) / rs.length).toFixed(2), n: rs.length } : null;
      }).filter(Boolean) as { name: string; material: MaterialId; time: number; n: number }[];
    }
    const nk = key as NumericParam;
    const pts = series.map((r) => ({ x: r.params[nk], time: +r.summary.fallTime.toFixed(2) })).sort((a, b) => a.x - b.x);
    const means = [...new Set(pts.map((p) => p.x))].map((x) => {
      const g = pts.filter((p) => p.x === x);
      return { x, mean: +(g.reduce((a, p) => a + p.time, 0) / g.length).toFixed(2) };
    });
    return { pts, means };
  }, [series, key]);

  const constants = (Object.keys(VARIABLE_LABELS) as VariableKey[]).filter((k) => k !== key);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Confetti fire={confetti} />
      <SectionHeading eyebrow="Step 4 · Fair testing" title="Variable Lab: change one thing at a time">
        A fair test changes <strong className="text-oat-50">exactly one variable</strong> and keeps everything else the same. Then any change in fall time must be caused by that one variable.
      </SectionHeading>

      <Card className="p-4 sm:p-5">
        <Segmented<VariableKey>
          label="Which variable will you test?"
          value={key}
          onChange={(k) => {
            setKey(k);
            navigate('variables', { var: k });
          }}
          options={VARS.map((v) => ({ value: v, label: VARIABLE_LABELS[v] }))}
        />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="p-5 sm:p-6">
          <CardHeader icon="layers" eyebrow="Independent variable" title={`Changing: ${VARIABLE_LABELS[key]}`}>
            Only this control is unlocked.
          </CardHeader>
          {key === 'material' ? (
            <MaterialPicker value={testValue.material} onChange={(m) => setTestValue({ ...testValue, material: m })} />
          ) : (
            <Slider
              {...PARAM_LIMITS[key as NumericParam]}
              label={VARIABLE_LABELS[key]}
              value={testValue[key as NumericParam]}
              format={fmtParam[key as NumericParam]}
              onChange={(v) => setTestValue({ ...testValue, [key]: v })}
            />
          )}
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-oat-100">
              <Icon name="lock" size={14} className="mr-1 inline" />
              Held constant (control variables)
            </p>
            <ul className="flex flex-wrap gap-2">
              {constants.map((k) => (
                <li key={k}>
                  <Badge tone="neutral">
                    {VARIABLE_LABELS[k]}: {fmtVal(k, baseline)}
                  </Badge>
                </li>
              ))}
              <li>
                <Badge tone="neutral">Same magnet · same release gate</Badge>
              </li>
            </ul>
            <button type="button" className="mt-3 text-sm font-semibold text-sage-300 underline underline-offset-4" aria-expanded={editBase} onClick={() => setEditBase(!editBase)}>
              {editBase ? 'Done changing the baseline' : 'Change the baseline (starts a new series)'}
            </button>
            {editBase && (
              <div className="mt-3 space-y-2 rounded-xl border border-espresso-700 p-3">
                {key !== 'material' && <MaterialPicker value={baseline.material} onChange={(m) => setBaseline({ ...baseline, material: m })} />}
                {(Object.keys(PARAM_LIMITS) as NumericParam[])
                  .filter((k) => k !== key)
                  .map((k) => (
                    <Slider key={k} {...PARAM_LIMITS[k]} value={baseline[k]} format={fmtParam[k]} onChange={(v) => setBaseline({ ...baseline, [k]: v })} />
                  ))}
              </div>
            )}
          </div>

          <fieldset className="mt-6 rounded-xl border border-espresso-700 p-4" disabled={testIsBaseline}>
            <legend className="px-1 text-sm font-semibold text-oat-50">
              Predict first: compared with the baseline ({fmtVal(key, baseline)}), the magnet will…
            </legend>
            {testIsBaseline ? (
              <p className="text-sm text-oat-400">Move the {VARIABLE_LABELS[key].toLowerCase()} control away from the baseline to make a prediction.</p>
            ) : (
              <Segmented<Direction>
                label="Your prediction"
                hideLabel
                value={prediction ?? ('' as Direction)}
                onChange={setPrediction}
                options={[
                  { value: 'slower', label: 'Fall slower' },
                  { value: 'faster', label: 'Fall faster' },
                  { value: 'same', label: 'Same' },
                ]}
              />
            )}
          </fieldset>

          {issues.length > 0 && (
            <p role="alert" className="mt-3 text-sm text-warn">
              {issues[0]}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="primary" size="lg" icon="play" onClick={doRun} disabled={issues.length > 0 || (!testIsBaseline && !prediction) || (!!active && !showOutcome)}>
              {baseTime === null ? 'Run baseline + test' : testIsBaseline ? 'Repeat the baseline' : 'Run this test'}
            </Button>
          </div>
          {!testIsBaseline && !prediction && <p className="mt-2 text-xs text-oat-400">Make a prediction to unlock the run.</p>}
        </Card>

        <Card className="p-5 sm:p-6" aria-live="polite">
          <CardHeader icon="flask" eyebrow="Result" title="Drop" />
          {!active && <p className="text-oat-400">Your drop will appear here. The baseline is measured automatically the first time.</p>}
          {active && <MiniDrop key={active.id} run={active} onDone={onLanded} />}
          <AnimatePresence>
            {active && showOutcome && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-3">
                <dl className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-oat-400">Fall time</dt>
                    <dd className="tabular text-lg font-semibold text-oat-50">{active.summary.fallTime.toFixed(2)} s</dd>
                  </div>
                  <div>
                    <dt className="text-oat-400">Average speed</dt>
                    <dd className="tabular text-lg font-semibold text-oat-50">{fmtSpeed(active.summary.avgSpeed)}</dd>
                  </div>
                  <div>
                    <dt className="text-oat-400">Braking strength</dt>
                    <dd className="tabular text-lg font-semibold text-oat-50">{active.summary.brakingCoefficient.toFixed(3)}</dd>
                    <dd className="text-xs text-oat-400">N·s/m · {active.summary.brakingLabel}</dd>
                  </div>
                </dl>
                {baseTime !== null && !testIsBaseline && (
                  <p className="text-sm text-oat-200">
                    Baseline: {baseTime.toFixed(2)} s → now {active.summary.fallTime.toFixed(2)} s (×{(active.summary.fallTime / baseTime).toFixed(2)}).
                  </p>
                )}
                {active.prediction && (
                  <p className={`flex items-center gap-2 rounded-lg p-3 text-sm font-semibold ${active.prediction.correct ? 'bg-success/12 text-success' : 'bg-warn/12 text-warn'}`}>
                    <Icon name={active.prediction.correct ? 'check' : 'cross'} size={18} />
                    {active.prediction.correct
                      ? `Correct! The magnet fell ${active.prediction.outcome === 'same' ? 'in about the same time' : active.prediction.outcome}.`
                      : `You predicted "${active.prediction.choice}", but it fell ${active.prediction.outcome === 'same' ? 'in about the same time' : active.prediction.outcome}. Why might that be?`}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-5 sm:p-6">
          <CardHeader icon="chart" title={`Fall time vs ${VARIABLE_LABELS[key].toLowerCase()}`}>
            Drawn automatically from your runs in this series.
          </CardHeader>
          {series.length < 2 ? (
            <p className="text-oat-400">Do at least two runs to see a graph.</p>
          ) : key === 'material' ? (
            <div className="h-64" role="img" aria-label={`Bar chart of mean fall time by material: ${(chartData as { name: string; time: number }[]).map((d) => `${d.name} ${d.time} seconds`).join(', ')}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData as { name: string; time: number; material: MaterialId }[]} margin={{ top: 20, right: 8, left: -12, bottom: 0 }} barCategoryGap="25%">
                  <CartesianGrid stroke="var(--color-espresso-700)" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'var(--color-oat-200)', fontSize: 12 }} stroke="var(--color-espresso-600)" />
                  <YAxis tick={{ fill: 'var(--color-oat-400)', fontSize: 11 }} stroke="var(--color-espresso-600)" unit=" s" />
                  <Tooltip cursor={{ fill: 'rgb(255 255 255 / .04)' }} contentStyle={{ background: 'var(--color-espresso-900)', border: '1px solid var(--color-espresso-600)', borderRadius: 10 }} formatter={(v) => [`${v} s`, 'Mean fall time']} />
                  <Bar dataKey="time" radius={[4, 4, 0, 0]} isAnimationActive>
                    {(chartData as { material: MaterialId }[]).map((d) => (
                      <Cell key={d.material} fill={MATERIALS[d.material].chartColor} />
                    ))}
                    <LabelList dataKey="time" position="top" fill="var(--color-oat-100)" fontSize={11} formatter={(v) => `${v} s`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64" role="img" aria-label={`Fall time against ${VARIABLE_LABELS[key]}: ${(chartData as { means: { x: number; mean: number }[] }).means.map((m) => `${m.x} gives ${m.mean} seconds`).join(', ')}`}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={(chartData as { means: { x: number; mean: number }[] }).means} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-espresso-700)" strokeDasharray="2 4" />
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={[PARAM_LIMITS[key as NumericParam].min, PARAM_LIMITS[key as NumericParam].max]}
                    tick={{ fill: 'var(--color-oat-400)', fontSize: 11 }}
                    stroke="var(--color-espresso-600)"
                    unit={` ${PARAM_LIMITS[key as NumericParam].unit}`}
                  />
                  <YAxis tick={{ fill: 'var(--color-oat-400)', fontSize: 11 }} stroke="var(--color-espresso-600)" unit=" s" />
                  <Tooltip contentStyle={{ background: 'var(--color-espresso-900)', border: '1px solid var(--color-espresso-600)', borderRadius: 10 }} />
                  <Line dataKey="mean" stroke="var(--color-field)" strokeWidth={2} dot={{ r: 5, fill: 'var(--color-field)', stroke: 'var(--color-espresso-800)', strokeWidth: 2 }} isAnimationActive name="Mean fall time" />
                  <Scatter data={(chartData as { pts: { x: number; time: number }[] }).pts} dataKey="time" fill="var(--color-oat-200)" name="Trial" shape="circle" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="fq-scroll mt-4 max-h-72 overflow-auto rounded-lg border border-espresso-700">
            <table className="w-full text-left text-sm tabular">
              <caption className="sr-only">Experiment table for {VARIABLE_LABELS[key]}</caption>
              <thead className="sticky top-0 bg-espresso-800 text-xs text-oat-300">
                <tr>
                  <th scope="col" className="px-3 py-2">#</th>
                  <th scope="col" className="px-3 py-2">{VARIABLE_LABELS[key]}</th>
                  <th scope="col" className="px-3 py-2">Fall time</th>
                  <th scope="col" className="px-3 py-2">Avg speed</th>
                  <th scope="col" className="px-3 py-2">Prediction</th>
                </tr>
              </thead>
              <tbody>
                {[...series].reverse().map((r) => (
                  <tr key={r.id} className="border-t border-espresso-700 text-oat-100">
                    <td className="px-3 py-2 text-oat-400">{r.n}</td>
                    <td className="px-3 py-2">
                      {fmtVal(key, r.params)} {differingKeys(r.params, baseline).length === 0 && <Badge tone="sage">baseline</Badge>}
                    </td>
                    <td className="px-3 py-2">{r.summary.fallTime.toFixed(2)} s</td>
                    <td className="px-3 py-2">{fmtSpeed(r.summary.avgSpeed)}</td>
                    <td className="px-3 py-2">
                      {r.prediction ? (
                        <span className={r.prediction.correct ? 'text-success' : 'text-warn'}>
                          {r.prediction.correct ? '✓' : '✕'} {r.prediction.choice}
                        </span>
                      ) : (
                        <span className="text-oat-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!series.length && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-oat-400">
                      No runs yet in this series.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <CardHeader icon="question" eyebrow="Reflect" title="Think like a scientist" />
          <label htmlFor="reflect" className="block text-oat-100">
            {REFLECT[key]}
          </label>
          <textarea
            id="reflect"
            rows={4}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Write your idea… (stays on this device)"
            className="fq-control mt-3 w-full rounded-xl border border-espresso-600 bg-espresso-900 p-3 text-oat-50 placeholder:text-oat-400"
          />
          <p className="mt-3 text-sm text-oat-300">
            Stuck? Ask Magneto, or open the <a className="font-semibold text-sage-300 underline" href={href('lab', { xray: '1' })}>X-Ray view</a> to watch the eddy currents change.
          </p>
          <div className="mt-6 rounded-xl border border-espresso-700 p-4 text-sm text-oat-200">
            <p className="font-semibold text-oat-50">Fair-test check</p>
            <ul className="mt-2 space-y-1">
              <li className="flex gap-2"><Icon name="check" size={16} className="mt-1 text-success" /> One variable changed: {VARIABLE_LABELS[key]}</li>
              <li className="flex gap-2"><Icon name="check" size={16} className="mt-1 text-success" /> {constants.length} variables held constant</li>
              <li className="flex gap-2">
                <Icon name={baselineRuns.length >= 2 ? 'check' : 'info'} size={16} className={`mt-1 ${baselineRuns.length >= 2 ? 'text-success' : 'text-oat-400'}`} />
                Repeat trials: baseline measured {baselineRuns.length}× {baselineRuns.length < 2 && '(try repeating it)'}
              </li>
            </ul>
          </div>
          {runs.some((r) => r.source === 'variables') && (
            <Button
              variant="danger"
              size="sm"
              className="mt-4"
              icon="trash"
              onClick={() => {
                if (confirm('Clear ALL experiment results (3D Lab and Variable Lab)? This cannot be undone.')) clearRuns();
              }}
            >
              Clear all results
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
