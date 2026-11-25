import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { downsample, G, type Trajectory } from '../../lib/physics';
import { usePlayback } from '../../store/playback';

const AXIS = { stroke: 'var(--color-oat-400)', fontSize: 11 };
const tooltipStyle = {
  contentStyle: { background: 'var(--color-espresso-900)', border: '1px solid var(--color-espresso-600)', borderRadius: 10, color: 'var(--color-oat-50)', fontSize: 12 },
  labelStyle: { color: 'var(--color-oat-200)' },
};

/** Live velocity–time and position–time graphs. Lines reveal progressively up to the playhead. */
export function LiveGraphs({ trajectory, advanced }: { trajectory: Trajectory | null; advanced: boolean }) {
  const tc = usePlayback((s) => s.tCoarse);
  const playing = usePlayback((s) => s.playing);
  const [table, setTable] = useState(false);
  const data = useMemo(() => {
    if (!trajectory) return [];
    const ff = trajectory.summary.freeFallTime;
    return downsample(trajectory, 140).map((s) => ({
      t: +s.t.toFixed(3),
      v: +(s.v * 100).toFixed(1),
      y: +(s.y * 100).toFixed(1),
      ff: s.t <= ff ? +(G * s.t * 100).toFixed(1) : null,
    }));
  }, [trajectory]);
  const end = trajectory?.summary.fallTime ?? 1;
  const cut = playing || tc < end - 1e-6 ? tc : end;
  const shown = data.map((d) => (d.t <= cut + 1e-9 ? d : { ...d, v: null, y: null }));
  const vmax = Math.max(50, ...data.map((d) => Math.max(d.v ?? 0, Math.min(d.ff ?? 0, (d.v ?? 0) * 1.6 + 40))));

  if (!trajectory)
    return <p className="rounded-xl border border-dashed border-espresso-600 p-6 text-center text-sm text-oat-400">Run an experiment to draw the velocity–time and position–time graphs.</p>;

  const s = trajectory.summary;
  const caption =
    `Speed rises from zero and ${Number.isFinite(s.terminalSpeed) ? `levels off near ${(s.terminalSpeed * 100).toFixed(0)} cm/s (terminal speed)` : 'keeps increasing, like free fall'}. ` +
    `The magnet takes ${s.fallTime.toFixed(2)} s to fall ${trajectory.params.dropHeightM.toFixed(1)} m, compared with ${s.freeFallTime.toFixed(2)} s in free fall.`;

  return (
    <div className="space-y-4">
      <figure aria-label="Velocity against time graph">
        <figcaption className="mb-1 flex items-baseline justify-between text-sm font-semibold text-oat-100">
          Velocity–time <span className="text-xs font-normal text-oat-400">cm/s vs s</span>
        </figcaption>
        <div className="h-44" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={shown} margin={{ top: 6, right: 10, bottom: 0, left: -14 }}>
              <CartesianGrid stroke="var(--color-espresso-700)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="t" type="number" domain={[0, end]} tick={AXIS} tickFormatter={(v) => v.toFixed(1)} stroke="var(--color-espresso-600)" />
              <YAxis tick={AXIS} domain={[0, Math.ceil(vmax / 10) * 10]} allowDataOverflow stroke="var(--color-espresso-600)" />
              <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v} cm/s`, n === 'v' ? 'This run' : 'Free fall']} labelFormatter={(l) => `t = ${l} s`} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-oat-200)' }} formatter={(v) => (v === 'v' ? 'This run' : 'Free fall (no braking)')} />
              <Line dataKey="ff" stroke="var(--color-oat-400)" strokeDasharray="5 4" dot={false} strokeWidth={1.5} isAnimationActive={false} connectNulls={false} />
              <Line dataKey="v" stroke="var(--color-field)" dot={false} strokeWidth={2} isAnimationActive={false} />
              {Number.isFinite(s.terminalSpeed) && s.terminalSpeed * 100 < vmax && (
                <ReferenceLine y={+(s.terminalSpeed * 100).toFixed(1)} stroke="var(--color-eddy)" strokeDasharray="3 3" label={{ value: 'terminal', fill: 'var(--color-eddy)', fontSize: 10, position: 'insideTopRight' }} />
              )}
              <ReferenceLine x={+cut.toFixed(3)} stroke="var(--color-sage-300)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </figure>
      <figure aria-label="Position against time graph">
        <figcaption className="mb-1 flex items-baseline justify-between text-sm font-semibold text-oat-100">
          Position–time <span className="text-xs font-normal text-oat-400">cm fallen vs s</span>
        </figcaption>
        <div className="h-36" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={shown} margin={{ top: 6, right: 10, bottom: 0, left: -14 }}>
              <CartesianGrid stroke="var(--color-espresso-700)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="t" type="number" domain={[0, end]} tick={AXIS} tickFormatter={(v) => v.toFixed(1)} stroke="var(--color-espresso-600)" />
              <YAxis tick={AXIS} domain={[0, trajectory.params.dropHeightM * 100]} stroke="var(--color-espresso-600)" />
              <Tooltip {...tooltipStyle} formatter={(v) => [`${v} cm`, 'Fallen']} labelFormatter={(l) => `t = ${l} s`} />
              <Line dataKey="y" stroke="var(--color-sage-300)" dot={false} strokeWidth={2} isAnimationActive={false} />
              <ReferenceLine x={+cut.toFixed(3)} stroke="var(--color-sage-300)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </figure>
      <p className="text-sm text-oat-300">{caption}</p>
      {advanced && Number.isFinite(s.terminalSpeed) && (
        <p className="rounded-lg bg-espresso-900/70 p-3 font-mono text-xs text-oat-200">
          v(t) ≈ v<sub>t</sub>(1 − e<sup>−t/τ</sup>), v<sub>t</sub> = mg/k = {(s.terminalSpeed * 100).toFixed(1)} cm/s, τ = m/k = {(s.timeConstant * 1000).toFixed(0)} ms
        </p>
      )}
      <button type="button" className="text-sm font-semibold text-sage-300 underline underline-offset-4" aria-expanded={table} onClick={() => setTable(!table)}>
        {table ? 'Hide' : 'Show'} graph data as a table
      </button>
      {table && (
        <div className="fq-scroll max-h-56 overflow-auto rounded-lg border border-espresso-700">
          <table className="w-full text-left text-xs tabular">
            <caption className="sr-only">Time, distance fallen and speed for this run</caption>
            <thead className="sticky top-0 bg-espresso-800 text-oat-200">
              <tr>
                <th scope="col" className="px-3 py-2">Time (s)</th>
                <th scope="col" className="px-3 py-2">Fallen (cm)</th>
                <th scope="col" className="px-3 py-2">Speed (cm/s)</th>
              </tr>
            </thead>
            <tbody>
              {data.filter((_, i) => i % 7 === 0 || i === data.length - 1).map((d) => (
                <tr key={d.t} className="border-t border-espresso-700 text-oat-100">
                  <td className="px-3 py-1.5">{d.t.toFixed(2)}</td>
                  <td className="px-3 py-1.5">{d.y.toFixed(1)}</td>
                  <td className="px-3 py-1.5">{d.v.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
