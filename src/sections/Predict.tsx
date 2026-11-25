import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLab, type Direction, type Predictions } from '../store/lab';
import { MATERIALS, type MaterialId } from '../lib/materials';
import { checkPredictions } from '../lib/patterns';
import { href } from '../lib/router';
import { announce } from '../store/announcer';
import { Card, SectionHeading } from '../components/ui/Card';
import { Button, LinkButton } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';

function ChoiceGroup<T extends string>({ legend, options, value, onChange, n }: { legend: string; options: { value: T; label: string; hint?: string; swatch?: string }[]; value?: T; onChange: (v: T) => void; n: number }) {
  const name = useId();
  return (
    <fieldset>
      <legend className="flex items-start gap-3 text-lg font-semibold text-oat-50">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-400 font-mono text-sm text-ink">{n}</span>
        {legend}
      </legend>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <label
              key={o.value}
              className={`relative flex min-h-[64px] cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-[border-color,background-color,transform] has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-sage-300 ${
                on ? 'border-sage-400 bg-sage-400/12' : 'border-espresso-700 hover:border-oat-400 active:scale-[0.99]'
              }`}
            >
              <input type="radio" name={name} value={o.value} checked={on} onChange={() => onChange(o.value)} className="sr-only" />
              {o.swatch && <span className="h-8 w-3 rounded-full" style={{ background: o.swatch }} aria-hidden />}
              <span>
                <span className="block font-semibold text-oat-50">{o.label}</span>
                {o.hint && <span className="block text-xs text-oat-400">{o.hint}</span>}
              </span>
              {on && <Icon name="check" size={20} className="ml-auto text-sage-300" />}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const REASONS = ['Metal is heavier', 'The magnet sticks to metal', 'Air gets trapped', 'Something invisible pushes back', 'Friction with the walls', 'I am not sure'];

export default function Predict() {
  const { predictions, setPredictions, runs } = useLab();
  const [draft, setDraft] = useState<Predictions>(predictions);
  const [saved, setSaved] = useState(!!predictions.savedAt);
  const checks = checkPredictions(predictions, runs);
  const complete = draft.fastest && draft.thickness && draft.diameter;
  const dirOpts: { value: Direction; label: string; hint: string }[] = [
    { value: 'slower', label: 'Falls slower', hint: 'Takes longer' },
    { value: 'faster', label: 'Falls faster', hint: 'Takes less time' },
    { value: 'same', label: 'No change', hint: 'Same time' },
  ];
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <SectionHeading eyebrow="Step 1 · Predict" title="Predict before you see">
        Scientists write down a prediction <em>before</em> the experiment, so the evidence can surprise them. There are no wrong answers yet. We will check later.
      </SectionHeading>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!complete) return;
          setPredictions({ ...draft, savedAt: Date.now() });
          setSaved(true);
          announce('Predictions locked in. Now run the experiment to test them.');
        }}
        className="space-y-6"
      >
        <Card className="p-5 sm:p-7">
          <ChoiceGroup<MaterialId>
            n={1}
            legend="The same magnet is dropped from the same height. Which tube will let it fall FASTEST?"
            value={draft.fastest}
            onChange={(fastest) => {
              setDraft({ ...draft, fastest });
              setSaved(false);
            }}
            options={(['plastic', 'aluminium', 'copper'] as MaterialId[]).map((m) => ({ value: m, label: MATERIALS[m].name.split(' ')[0], hint: MATERIALS[m].conductive ? 'Metal, not magnetic' : 'Insulator', swatch: MATERIALS[m].color }))}
          />
        </Card>
        <Card className="p-5 sm:p-7">
          <label htmlFor="why" className="flex items-start gap-3 text-lg font-semibold text-oat-50">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-400 font-mono text-sm text-ink">2</span>
            Why do you think so?
          </label>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Quick reasons">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={draft.why === r}
                onClick={() => setDraft({ ...draft, why: r })}
                className={`fq-control min-h-[40px] rounded-full border px-3 text-sm ${draft.why === r ? 'border-sage-400 bg-sage-400/15 text-sage-200' : 'border-espresso-600 text-oat-200 hover:border-oat-400'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <textarea
            id="why"
            rows={3}
            maxLength={400}
            value={draft.why ?? ''}
            onChange={(e) => setDraft({ ...draft, why: e.target.value })}
            placeholder="Or write your own reason…"
            className="fq-control mt-3 w-full rounded-xl border border-espresso-600 bg-espresso-900 p-3 text-oat-50 placeholder:text-oat-400"
          />
        </Card>
        <Card className="p-5 sm:p-7">
          <ChoiceGroup<Direction>
            n={3}
            legend="In a metal tube, what happens if the tube WALL becomes thicker?"
            value={draft.thickness}
            onChange={(thickness) => {
              setDraft({ ...draft, thickness });
              setSaved(false);
            }}
            options={dirOpts}
          />
        </Card>
        <Card className="p-5 sm:p-7">
          <ChoiceGroup<Direction>
            n={4}
            legend="In a metal tube, what happens if the tube’s inside DIAMETER becomes bigger (a wider tube)?"
            value={draft.diameter}
            onChange={(diameter) => {
              setDraft({ ...draft, diameter });
              setSaved(false);
            }}
            options={dirOpts}
          />
        </Card>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" size="lg" icon="lock" disabled={!complete}>
            {saved ? 'Predictions locked in' : 'Lock in my predictions'}
          </Button>
          {!complete && <p className="text-sm text-oat-400">Answer questions 1, 3 and 4 to continue.</p>}
        </div>
      </form>

      <AnimatePresence>
        {saved && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8">
            <Card className="border-sage-500 p-6">
              <p className="flex items-center gap-2 font-semibold text-success">
                <Icon name="check" size={20} /> Saved on this device.
              </p>
              <p className="mt-2 text-oat-200">Now test your ideas. Run plastic, aluminium and copper with the same settings, then use the Variable Lab to test thickness and diameter one at a time.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <LinkButton variant="primary" href={href('lab')} iconRight="arrowRight">
                  Go to the 3D Lab
                </LinkButton>
                <LinkButton href={href('variables', { var: 'wallMm' })}>Test wall thickness</LinkButton>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {checks.length > 0 && (
        <section aria-labelledby="pc" className="mt-10">
          <h2 id="pc" className="fq-h3 text-oat-50">
            Prediction vs evidence
          </h2>
          <ul className="mt-4 space-y-3">
            {checks.map((c) => (
              <li key={c.question}>
                <Card className="flex items-start gap-3 p-4">
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${c.correct === null ? 'bg-espresso-700 text-oat-300' : c.correct ? 'bg-success/20 text-success' : 'bg-warn/20 text-warn'}`}
                  >
                    <Icon name={c.correct === null ? 'question' : c.correct ? 'check' : 'cross'} size={18} />
                  </span>
                  <div className="text-sm">
                    <p className="font-semibold text-oat-50">{c.question}</p>
                    <p className="text-oat-300">You predicted: {c.predicted}</p>
                    <p className={c.correct === null ? 'text-oat-400' : c.correct ? 'text-success' : 'text-warn'}>
                      {c.evidence ? `${c.correct ? 'Correct' : 'Not this time'}: ${c.evidence}` : 'Not tested fairly yet. Change only this variable in the Variable Lab.'}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
