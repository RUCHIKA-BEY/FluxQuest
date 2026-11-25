import { useEffect, useState } from 'react';
import { Card, CardHeader, SectionHeading } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon, type IconName } from '../components/ui/Icon';
import { href } from '../lib/router';

const STEPS = [
  { t: 'Set up', d: 'Clamp the tubes vertically side by side. Use a plumb line or spirit level, because a tilted tube lets the magnet rub the wall.' },
  { t: 'Mark the points', d: 'Mark a START line at the top and a FINISH line at the bottom of each tube. Measure and record the distance between them.' },
  { t: 'Same release every time', d: 'Hold the magnet with the same pole down, just above the START line, using the release gate or a card slide. Never push or throw it.' },
  { t: 'Time it', d: 'One student says “3-2-1-release”. The timer starts on “release” and stops when the magnet passes FINISH (or is heard landing on the soft pad).' },
  { t: 'Repeat', d: 'Do at least 3 trials per tube. Different students can take turns timing. Record every trial, even odd ones.' },
  { t: 'Average and compare', d: 'Work out the average for each tube. Compare plastic vs metals, then thick vs thin walls and narrow vs wide tubes, changing ONE thing at a time.' },
];

const CHECKLIST = [
  'Same magnet for every trial (same pole facing down)',
  'Same release point (START line or release gate)',
  'Same finish point (FINISH line)',
  'Tubes vertical and firmly clamped',
  'Same timer and timing method for all tubes',
  'Only ONE variable changed between compared tubes',
  'At least 3 trials per tube',
  'Soft landing pad under every tube',
];

const IMPROVE: { icon: IconName; t: string; d: string }[] = [
  { icon: 'lock', t: 'Consistent release mechanism', d: 'A hinged flap or sliding card under the tube mouth, opened by a lever, gives the same start every time (no hand jitter).' },
  { icon: 'chart', t: 'Marked heights', d: 'Paint or tape rings every 10 cm on the outside of the tubes, so students can estimate speed at different points.' },
  { icon: 'target', t: 'Repeatable timing', d: 'Use a phone slow-motion video, or a simple light gate (LED + LDR) at START and FINISH. Phone timers on audio clicks are also good.' },
  { icon: 'layers', t: 'Interchangeable tubes', d: 'Use a common clamp height and length so plastic, aluminium, copper, thin and thick tubes can be swapped quickly.' },
  { icon: 'eye', t: 'Clear measurement points', d: 'Small viewing slots break the conducting loops and change the braking! Instead, mark points outside and use sound or a light gate (see P022).' },
];

const KEY = 'fq-checklist';

export default function RealModel() {
  const [checked, setChecked] = useState<boolean[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '[]');
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(checked));
    } catch {
      /* storage unavailable */
    }
  }, [checked]);
  const done = CHECKLIST.filter((_, i) => checked[i]).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <SectionHeading eyebrow="Hands-on companion" title="Real Agastya Lazy Tube model">
        FluxQuest <strong className="text-oat-50">supports</strong> the physical model. It doesn't replace it. Real magnets, real tubes and real stopwatches give you evidence that no simulation can.
      </SectionHeading>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-5 sm:p-6">
          <CardHeader icon="flask" eyebrow="Classroom procedure" title="Step by step" />
          <ol className="space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-400 font-mono font-semibold text-ink">{i + 1}</span>
                <div>
                  <p className="font-semibold text-oat-50">{s.t}</p>
                  <p className="text-sm text-oat-200">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
        <Card className="p-5 sm:p-6">
          <CardHeader icon="check" eyebrow="Fair-testing checklist" title={`${done} of ${CHECKLIST.length} ready`} />
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-espresso-700" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={CHECKLIST.length} aria-label="Checklist progress">
            <div className="h-full rounded-full bg-sage-400 transition-[width] duration-300" style={{ width: `${(done / CHECKLIST.length) * 100}%` }} />
          </div>
          <ul className="space-y-1">
            {CHECKLIST.map((c, i) => (
              <li key={c}>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-oat-50/4">
                  <input
                    type="checkbox"
                    checked={!!checked[i]}
                    onChange={(e) => {
                      const n = [...checked];
                      n[i] = e.target.checked;
                      setChecked(n);
                    }}
                    className="h-5 w-5 accent-[var(--color-sage-400)]"
                  />
                  <span className={`text-sm ${checked[i] ? 'text-oat-400 line-through' : 'text-oat-100'}`}>{c}</span>
                </label>
              </li>
            ))}
          </ul>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setChecked([])}>
            Clear checklist
          </Button>
        </Card>
      </div>

      <Card className="print-area mt-6 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="fq-eyebrow">Printable</p>
            <h2 className="fq-h3 text-oat-50">Lazy Tube observation table</h2>
          </div>
          <Button icon="print" onClick={() => window.print()} className="no-print">
            Print this table
          </Button>
        </div>
        <p className="mb-3 text-sm text-oat-300">Name / group: ______________________ Date: ____________ Drop distance (START → FINISH): ______ cm</p>
        <div className="fq-scroll overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">Blank observation table for recording fall times</caption>
            <thead>
              <tr className="text-oat-200">
                {['Tube (material)', 'Wall thickness', 'Inside diameter', 'Trial 1 (s)', 'Trial 2 (s)', 'Trial 3 (s)', 'Average (s)', 'Notes'].map((h) => (
                  <th key={h} scope="col" className="border border-espresso-600 px-2 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['Plastic', 'Aluminium', 'Copper', '', '', ''].map((m, i) => (
                <tr key={i}>
                  <td className="h-10 border border-espresso-600 px-2 text-oat-100">{m}</td>
                  {Array.from({ length: 7 }, (_, j) => (
                    <td key={j} className="border border-espresso-600" />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-oat-300">My prediction: ____________________________________ Was it correct? ☐ Yes ☐ No ☐ Partly</p>
        <p className="mt-2 text-sm text-oat-300">What pattern did we find? ________________________________________________________________</p>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="border-warn/50 p-5 sm:p-6">
          <CardHeader icon="shield" eyebrow="Safety first" title="Safety guidance" />
          <ul className="space-y-2 text-sm text-oat-100">
            {[
              'Strong (neodymium) magnets can snap together and pinch fingers. Keep them apart and slide them, don’t pull.',
              'Keep magnets away from phones, cards, hearing aids and anyone with a pacemaker or medical implant.',
              'Magnets are a serious danger if swallowed. Never put them in your mouth. Count them in and out.',
              'Use a soft pad under each tube. A falling magnet can chip or shatter.',
              'Clamp tubes firmly. A falling metal tube is heavy.',
              'Never connect the tubes or magnets to mains electricity or batteries. This experiment needs no power at all.',
            ].map((s) => (
              <li key={s} className="flex gap-2">
                <Icon name="info" size={16} className="mt-1 shrink-0 text-warn" />
                {s}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5 sm:p-6">
          <CardHeader icon="sparkle" eyebrow="Make it better" title="Ideas for improving the physical model" />
          <ul className="space-y-3">
            {IMPROVE.map((x) => (
              <li key={x.t} className="flex gap-3">
                <Icon name={x.icon} size={20} className="mt-0.5 shrink-0 text-sage-300" />
                <div>
                  <p className="font-semibold text-oat-50">{x.t}</p>
                  <p className="text-sm text-oat-200">{x.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <CardHeader icon="book" eyebrow="For teachers & Ignators" title="Facilitation guide (about 40 minutes)" />
        <div className="grid gap-4 text-sm text-oat-200 md:grid-cols-4">
          {[
            ['5 min · Hook', 'Drop the magnet through plastic, then copper, without explaining anything. Ask: “What did you notice? What do you wonder?”'],
            ['10 min · Predict', 'Groups use the Predict page or paper. Push for reasons: “Why do you think so?” Accept every idea and don’t correct it yet.'],
            ['15 min · Investigate', 'Run fair tests on the real tubes. Then use the 3D lab’s X-Ray mode to see what the eye can’t. Insist on 3 trials and one variable at a time.'],
            ['10 min · Explain', 'Groups compare evidence with predictions. Build the story: moving magnet → changing field → eddy currents → opposing field → braking → heat.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-espresso-700 p-4">
              <p className="font-semibold text-oat-50">{t}</p>
              <p className="mt-1">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-espresso-900/70 p-4 text-sm text-oat-200">
          <p className="font-semibold text-oat-50">Questions that guide without telling</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>“Does a magnet stick to copper? So why does copper affect it?”</li>
            <li>“What would happen if we cut a slit all along the tube?” (It breaks the current loops, so braking drops a lot.)</li>
            <li>“If the magnet slows down, where did its energy go?”</li>
            <li>“How could we make our timing fairer?”</li>
          </ul>
          <p className="mt-3">
            Common misconception: <em>“Copper is magnetic.”</em> Show that a magnet doesn’t stick to it, then ask what else could cause a force. The <a href={href('lab', { xray: '1' })} className="font-semibold text-sage-300 underline">X-Ray view</a> helps here.
          </p>
        </div>
      </Card>
    </div>
  );
}
