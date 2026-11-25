import type React from 'react';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLab } from '../store/lab';
import { MATERIALS } from '../lib/materials';
import { VARIABLE_LABELS } from '../lib/physics';
import { checkPredictions, describePatterns } from '../lib/patterns';
import { toCSV, downloadText, copyText } from '../lib/csv';
import { fmtSpeed } from '../lib/format';
import { href, navigate } from '../lib/router';
import { announce } from '../store/announcer';
import { Card, CardHeader, SectionHeading, Badge } from '../components/ui/Card';
import { Button, LinkButton } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';

export default function Results() {
  const { runs, predictions, clearRuns, loadRun, setView } = useLab();
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const rows = useMemo(
    () => [
      ['Run', 'Source', 'Material', 'Wall (mm)', 'Inner diameter (mm)', 'Magnet strength (x)', 'Drop height (m)', 'Fall time (s)', 'Average speed (m/s)', 'Braking coefficient (N s/m)', 'Changed variable', 'Prediction', 'Prediction correct'],
      ...runs.map((r) => [
        r.n,
        r.source === 'lab' ? '3D Lab' : 'Variable Lab',
        MATERIALS[r.params.material].name,
        r.params.wallMm,
        r.params.innerDiameterMm,
        r.params.magnetStrength,
        r.params.dropHeightM,
        r.summary.fallTime.toFixed(3),
        r.summary.avgSpeed.toFixed(3),
        r.summary.brakingCoefficient.toFixed(4),
        r.changed ? VARIABLE_LABELS[r.changed] : '',
        r.prediction?.choice ?? '',
        r.prediction ? (r.prediction.correct ? 'yes' : 'no') : '',
      ]),
    ],
    [runs],
  );

  if (!runs.length)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <SectionHeading eyebrow="Step 5 · Evidence" title="Results and evidence" />
        <Card className="p-8">
          <Icon name="chart" size={40} className="mx-auto text-sage-300" />
          <p className="mt-4 text-lg text-oat-200">No experiments yet. Your results will appear here automatically.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <LinkButton variant="primary" href={href('lab')} iconRight="arrowRight">
              Open the 3D Lab
            </LinkButton>
            <LinkButton href={href('variables')}>Variable Lab</LinkButton>
          </div>
        </Card>
      </div>
    );

  const sorted = [...runs].sort((a, b) => a.summary.fallTime - b.summary.fallTime);
  const fastest = sorted[0];
  const slowest = sorted[sorted.length - 1];
  const vlPreds = runs.filter((r) => r.prediction);
  const vlCorrect = vlPreds.filter((r) => r.prediction!.correct).length;
  const checks = checkPredictions(predictions, runs).filter((c) => c.correct !== null);
  const totalPred = vlPreds.length + checks.length;
  const totalCorrect = vlCorrect + checks.filter((c) => c.correct).length;
  const accuracy = totalPred ? totalCorrect / totalPred : null;
  const patterns = describePatterns(runs);
  const recent = runs.slice(-12).map((r) => ({ name: `#${r.n}`, time: +r.summary.fallTime.toFixed(2), material: r.params.material, sym: MATERIALS[r.params.material].symbol }));

  const stat = (label: string, value: React.ReactNode, sub: string, icon: Parameters<typeof Icon>[0]['name'], delay: number) => (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="h-full p-5">
        <p className="flex items-center gap-2 text-sm text-oat-300">
          <Icon name={icon} size={16} className="text-sage-300" /> {label}
        </p>
        <p className="mt-2 font-display text-3xl font-bold text-oat-50">{value}</p>
        <p className="mt-1 text-xs text-oat-400">{sub}</p>
      </Card>
    </motion.div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeading eyebrow="Step 5 · Evidence" title="Results and evidence">
        Every run you make is saved here (only on this device). Look for patterns, check your predictions, and export your table for your notebook.
      </SectionHeading>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stat('Experiments run', <AnimatedNumber value={runs.length} format={(v) => Math.round(v).toString()} />, `${runs.filter((r) => r.source === 'variables').length} in the Variable Lab`, 'flask', 0)}
        {stat('Fastest fall', <><AnimatedNumber value={fastest.summary.fallTime} /> s</>, `Run #${fastest.n} · ${MATERIALS[fastest.params.material].name}`, 'bolt', 0.06)}
        {stat('Slowest fall', <><AnimatedNumber value={slowest.summary.fallTime} /> s</>, `Run #${slowest.n} · ${MATERIALS[slowest.params.material].name}, ${slowest.params.wallMm} mm wall, Ø${slowest.params.innerDiameterMm} mm`, 'magnet', 0.12)}
        {stat(
          'Prediction accuracy',
          accuracy === null ? '—' : <><AnimatedNumber value={accuracy * 100} format={(v) => Math.round(v).toString()} />%</>,
          accuracy === null ? 'Make predictions to track this' : `${totalCorrect} of ${totalPred} predictions matched the evidence`,
          'target',
          0.18,
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-5 sm:p-6">
          <CardHeader icon="chart" title="Fall time of your last runs" />
          <div className="h-64" role="img" aria-label={`Bar chart of fall times: ${recent.map((r) => `${r.name} ${r.sym} ${r.time} seconds`).join(', ')}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recent} margin={{ top: 10, right: 8, left: -12, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid stroke="var(--color-espresso-700)" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--color-oat-300)', fontSize: 11 }} stroke="var(--color-espresso-600)" />
                <YAxis tick={{ fill: 'var(--color-oat-400)', fontSize: 11 }} unit=" s" stroke="var(--color-espresso-600)" />
                <Tooltip
                  cursor={{ fill: 'rgb(255 255 255 / .04)' }}
                  contentStyle={{ background: 'var(--color-espresso-900)', border: '1px solid var(--color-espresso-600)', borderRadius: 10 }}
                  formatter={(v, _n, p) => [`${v} s`, MATERIALS[(p.payload as { material: keyof typeof MATERIALS }).material].name]}
                />
                <Bar dataKey="time" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: 'var(--color-oat-200)', fontSize: 10, formatter: (v: unknown) => String(v) }}>
                  {recent.map((r) => (
                    <Cell key={r.name} fill={MATERIALS[r.material].chartColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 flex flex-wrap gap-3 text-xs text-oat-200" aria-label="Colour key">
            {Object.values(MATERIALS).map((m) => (
              <li key={m.id} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm" style={{ background: m.chartColor }} aria-hidden /> {m.symbol} {m.name.split(' ')[0]}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5 sm:p-6">
          <CardHeader icon="sparkle" eyebrow="What your evidence shows" title="Patterns" />
          {patterns.length ? (
            <ul className="space-y-3">
              {patterns.map((p) => (
                <li key={p} className="flex gap-2 text-sm text-oat-100">
                  <Icon name="arrowRight" size={16} className="mt-1 shrink-0 text-sage-300" />
                  {p}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-oat-300">
              Patterns appear once you have <strong>fair pairs</strong>: two runs that differ in only one setting. Try the <a className="font-semibold text-sage-300 underline" href={href('variables')}>Variable Lab</a>.
            </p>
          )}
          {checks.length > 0 && (
            <div className="mt-5 border-t border-espresso-700 pt-4">
              <p className="mb-2 text-sm font-semibold text-oat-50">Your predictions</p>
              <ul className="space-y-2 text-sm">
                {checks.map((c) => (
                  <li key={c.question} className={`flex gap-2 ${c.correct ? 'text-success' : 'text-warn'}`}>
                    <Icon name={c.correct ? 'check' : 'cross'} size={16} className="mt-1 shrink-0" />
                    <span>
                      <strong>{c.question}</strong> {c.evidence}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="fq-h3 text-oat-50">Experiment history</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              icon="copy"
              onClick={async () => {
                const ok = await copyText(rows.map((r) => r.join('\t')).join('\n'));
                setCopied(ok);
                announce(ok ? 'Results table copied. Paste it into a spreadsheet.' : 'Copy failed.');
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? 'Copied!' : 'Copy table'}
            </Button>
            <Button size="sm" icon="download" onClick={() => downloadText(`fluxquest-results-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows))}>
              Download CSV
            </Button>
            {confirming ? (
              <span className="flex items-center gap-2" role="group" aria-label="Confirm reset">
                <span className="text-sm text-warn">Delete all {runs.length} runs?</span>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    clearRuns();
                    setConfirming(false);
                    announce('Experiment log cleared.');
                  }}
                >
                  Yes, delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </span>
            ) : (
              <Button size="sm" variant="danger" icon="trash" onClick={() => setConfirming(true)}>
                Reset log
              </Button>
            )}
          </div>
        </div>
        <div className="fq-scroll overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm tabular">
            <caption className="sr-only">All experiment runs, newest first</caption>
            <thead className="text-xs text-oat-300">
              <tr className="border-b border-espresso-700">
                {['#', 'Material', 'Wall', 'Ø inner', 'Magnet', 'Height', 'Fall time', 'Avg speed', 'Braking', 'Changed', ''].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-semibold">
                    {h || <span className="sr-only">Actions</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...runs].reverse().map((r) => (
                <tr key={r.id} className="border-b border-espresso-700/60 text-oat-100 hover:bg-oat-50/3">
                  <td className="px-3 py-2 text-oat-400">{r.n}</td>
                  <td className="px-3 py-2">
                    <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: MATERIALS[r.params.material].chartColor }} aria-hidden />
                    {MATERIALS[r.params.material].name.split(' ')[0]}
                  </td>
                  <td className="px-3 py-2">{r.params.wallMm} mm</td>
                  <td className="px-3 py-2">{r.params.innerDiameterMm} mm</td>
                  <td className="px-3 py-2">×{r.params.magnetStrength}</td>
                  <td className="px-3 py-2">{r.params.dropHeightM} m</td>
                  <td className="px-3 py-2 font-semibold">{r.summary.fallTime.toFixed(2)} s</td>
                  <td className="px-3 py-2">{fmtSpeed(r.summary.avgSpeed)}</td>
                  <td className="px-3 py-2">
                    <Badge tone={r.summary.brakingLabel === 'none' ? 'neutral' : 'current'}>{r.summary.brakingLabel}</Badge>
                  </td>
                  <td className="px-3 py-2 text-oat-300">{r.changed ? VARIABLE_LABELS[r.changed] : '—'}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="min-h-[36px] rounded-lg px-2 text-xs font-semibold text-sage-300 underline underline-offset-2"
                      onClick={() => {
                        loadRun(r.id);
                        setView({ camera: 'side' });
                        navigate('lab');
                      }}
                      aria-label={`Replay run ${r.n} in the 3D lab`}
                    >
                      Replay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
