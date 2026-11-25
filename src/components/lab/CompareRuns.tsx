import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MATERIALS } from '../../lib/materials';
import { PARAM_LIMITS, VARIABLE_LABELS, sampleAt, simulate, type NumericParam } from '../../lib/physics';
import { useLab, type RunRecord } from '../../store/lab';
import { useReducedMotion } from '../../hooks/useMotionPref';
import { TubeDiagram2D } from './TubeDiagram2D';
import { Button } from '../ui/Button';

export const runLabel = (r: RunRecord) =>
  `#${r.n} ${MATERIALS[r.params.material].symbol} · ${r.params.wallMm}mm wall · Ø${r.params.innerDiameterMm}mm · ×${r.params.magnetStrength} · ${r.params.dropHeightM}m → ${r.summary.fallTime.toFixed(2)}s`;

const A = '#3987E5';
const B = '#D95926';

/** Side-by-side twin tubes with a synchronised clock and an overlaid speed graph. */
export function CompareRuns() {
  const { runs, compare, setView } = useLab();
  const reduce = useReducedMotion();
  const ids: [string | null, string | null] = [compare[0] ?? runs[runs.length - 2]?.id ?? null, compare[1] ?? runs[runs.length - 1]?.id ?? null];
  const ra = runs.find((r) => r.id === ids[0]);
  const rb = runs.find((r) => r.id === ids[1]);
  const ta = useMemo(() => (ra ? simulate(ra.params, ra.seed) : null), [ra]);
  const tb = useMemo(() => (rb ? simulate(rb.params, rb.seed) : null), [rb]);
  const dur = Math.max(ta?.summary.fallTime ?? 0, tb?.summary.fallTime ?? 0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(reduce ? 0.25 : 1);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setT((x) => {
        const n = x + dt * speed;
        if (n >= dur) {
          setPlaying(false);
          return dur;
        }
        return n;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, dur]);

  const chart = useMemo(() => {
    if (!ta || !tb) return [];
    const n = 120;
    return Array.from({ length: n + 1 }, (_, i) => {
      const tt = (i / n) * dur;
      return {
        t: +tt.toFixed(3),
        a: tt <= ta.summary.fallTime ? +(sampleAt(ta, tt).v * 100).toFixed(1) : null,
        b: tt <= tb.summary.fallTime ? +(sampleAt(tb, tt).v * 100).toFixed(1) : null,
      };
    });
  }, [ta, tb, dur]);

  if (runs.length < 2) return <p className="text-sm text-oat-400">Do at least two runs to compare them side by side.</p>;

  const diffs = ra && rb ? (['material', ...(Object.keys(PARAM_LIMITS) as NumericParam[])] as const).filter((k) => ra.params[k] !== rb.params[k]) : [];

  const select = (slot: 0 | 1) => (
    <label className="block text-sm">
      <span className="mb-1 flex items-center gap-2 font-semibold text-oat-100">
        <span className="inline-block h-3 w-3 rounded-sm" style={{ background: slot ? B : A }} aria-hidden /> Run {slot ? 'B' : 'A'}
      </span>
      <select
        className="fq-control min-h-[44px] w-full rounded-lg border border-espresso-600 bg-espresso-900 px-2 text-xs text-oat-50"
        value={ids[slot] ?? ''}
        onChange={(e) => {
          const next: [string | null, string | null] = [...ids];
          next[slot] = e.target.value;
          setView({ compare: next });
          setT(0);
          setPlaying(false);
        }}
      >
        {[...runs].reverse().map((r) => (
          <option key={r.id} value={r.id}>
            {runLabel(r)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {select(0)}
        {select(1)}
      </div>
      <p className="text-sm" role="status">
        {diffs.length === 0 && <span className="text-oat-300">Same settings: differences come only from small trial-to-trial variation.</span>}
        {diffs.length === 1 && (
          <span className="text-success">✓ Fair comparison: only <strong>{VARIABLE_LABELS[diffs[0]]}</strong> differs.</span>
        )}
        {diffs.length > 1 && (
          <span className="text-warn">
            ⚠ Not a fair test: {diffs.map((d) => VARIABLE_LABELS[d]).join(', ')} all differ, so you cannot tell which one caused the change.
          </span>
        )}
      </p>
      {ra && rb && ta && tb && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {[
              [ra, ta, A, 'A'],
              [rb, tb, B, 'B'],
            ].map(([r, tr, c, name]) => {
              const run = r as RunRecord;
              const traj = tr as typeof ta;
              const done = t >= traj.summary.fallTime;
              return (
                <div key={name as string} className="rounded-xl border-2 p-2" style={{ borderColor: c as string }}>
                  <p className="text-center text-xs font-semibold text-oat-100">
                    {name as string}: {MATERIALS[run.params.material].name.split(' ')[0]}
                  </p>
                  <div className="mx-auto h-72 max-w-[200px] sm:h-96">
                    <TubeDiagram2D compact params={run.params} sample={sampleAt(traj, t)} title={`Run ${name}`} />
                  </div>
                  <p className={`text-center text-sm font-semibold tabular ${done ? 'text-success' : 'text-oat-300'}`}>{done ? `Landed: ${traj.summary.fallTime.toFixed(2)} s` : `${Math.min(t, traj.summary.fallTime).toFixed(2)} s`}</p>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon={playing ? 'pause' : 'play'} onClick={() => (t >= dur ? (setT(0), setPlaying(true)) : setPlaying(!playing))}>
              {playing ? 'Pause' : t >= dur ? 'Race again' : 'Race both'}
            </Button>
            <Button onClick={() => setSpeed(speed === 1 ? 0.25 : 1)}>{speed === 1 ? 'Slow motion (0.25×)' : 'Real time'}</Button>
          </div>
          <figure>
            <figcaption className="mb-1 text-sm font-semibold text-oat-100">Speed of A and B (cm/s)</figcaption>
            <div className="h-48" aria-hidden>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ top: 6, right: 12, bottom: 0, left: -14 }}>
                  <CartesianGrid stroke="var(--color-espresso-700)" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="t" type="number" domain={[0, dur]} tickFormatter={(v) => v.toFixed(1)} tick={{ fill: 'var(--color-oat-400)', fontSize: 11 }} stroke="var(--color-espresso-600)" />
                  <YAxis tick={{ fill: 'var(--color-oat-400)', fontSize: 11 }} stroke="var(--color-espresso-600)" />
                  <Tooltip contentStyle={{ background: 'var(--color-espresso-900)', border: '1px solid var(--color-espresso-600)', borderRadius: 10, fontSize: 12 }} labelFormatter={(l) => `t = ${l} s`} />
                  <Legend formatter={(v) => (v === 'a' ? `A · ${MATERIALS[ra.params.material].symbol}` : `B · ${MATERIALS[rb.params.material].symbol}`)} wrapperStyle={{ fontSize: 11 }} />
                  <Line dataKey="a" stroke={A} strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line dataKey="b" stroke={B} strokeWidth={2} dot={false} strokeDasharray="6 3" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-oat-300">
              A lands in {ta.summary.fallTime.toFixed(2)} s and B lands in {tb.summary.fallTime.toFixed(2)} s.{' '}
              {Math.abs(ta.summary.fallTime - tb.summary.fallTime) < 0.05 * Math.max(ta.summary.fallTime, tb.summary.fallTime)
                ? 'They are within normal trial variation.'
                : `${ta.summary.fallTime > tb.summary.fallTime ? 'A' : 'B'} is ${(Math.max(ta.summary.fallTime, tb.summary.fallTime) / Math.min(ta.summary.fallTime, tb.summary.fallTime)).toFixed(1)}× slower.`}
            </p>
          </figure>
        </>
      )}
    </div>
  );
}
