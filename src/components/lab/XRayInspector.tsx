import type { ReactNode } from 'react';
import { useState } from 'react';
import { MATERIALS } from '../../lib/materials';
import { sampleAt, xrayReadout, type Trajectory } from '../../lib/physics';
import { si } from '../../lib/format';
import { usePlayback } from '../../store/playback';
import { Icon } from '../ui/Icon';

/** Pause-and-inspect panel: answers the four X-ray questions for the exact frame being shown. */
export function XRayInspector({ trajectory, advanced }: { trajectory: Trajectory | null; advanced: boolean }) {
  const t = usePlayback((s) => s.t);
  const playing = usePlayback((s) => s.playing);
  const [open, setOpen] = useState<number>(0);
  if (!trajectory) return <p className="text-sm text-oat-400">Drop the magnet, then pause at any moment to inspect it.</p>;
  const s = sampleAt(trajectory, t);
  const r = xrayReadout(trajectory.params, s);
  const mat = MATERIALS[trajectory.params.material];
  const moving = s.v > 0.005;
  const level = r.brakeOverWeight > 0.66 ? 'strong' : r.brakeOverWeight > 0.25 ? 'moderate' : r.brakeOverWeight > 0.02 ? 'weak' : 'almost no';

  const qs: { q: string; a: ReactNode; adv?: ReactNode }[] = [
    {
      q: 'What is happening to the magnetic field?',
      a: moving ? (
        <>
          The magnet carries its field with it. Just <strong className="text-field">below</strong> the magnet, the field passing through the tube wall is getting{' '}
          <strong>stronger</strong>. Just <strong className="text-field">above</strong> it, the field is getting <strong>weaker</strong>. The faster the magnet moves, the faster
          this change happens.
        </>
      ) : (
        <>The magnet is not moving yet, so the field through the tube is not changing. No change means no induced current.</>
      ),
      adv: (
        <>
          Flux through a wall ring one magnet-length ahead: Φ ≈ {si(r.fluxAhead, 'Wb')}, changing at dΦ/dt ≈ {si(r.fluxRateAhead, 'Wb/s')} (behind: {si(r.fluxRateBehind, 'Wb/s')}).
        </>
      ),
    },
    {
      q: 'Why is current induced?',
      a: mat.conductive ? (
        <>
          A <em>changing</em> magnetic field pushes on the free electrons in {mat.name.toLowerCase()}. They flow round and round the tube wall in loops. These loops are{' '}
          <strong className="text-eddy">eddy currents</strong>. Right now they are <strong>{level}</strong>.
        </>
      ) : (
        <>
          The field is still changing, but plastic has <strong>no free electrons</strong> that can flow. So no eddy currents form, nothing pushes back, and the magnet falls almost freely.
        </>
      ),
      adv: mat.conductive ? (
        <>
          Faraday: ℰ = −dΦ/dt. Around that ring ℰ ≈ {si(r.emfAhead, 'V')}. Small, but the copper ring's resistance is tiny, so the current I = ℰ/R is large.
        </>
      ) : (
        <>σ ≈ 0 for plastic, so J = σE ≈ 0 even though an induced electric field exists.</>
      ),
    },
    {
      q: 'Which direction does the induced field point?',
      a: mat.conductive ? (
        <>
          <strong>Lenz's law:</strong> the induced current always fights the change. Below the magnet, the current loop becomes a little magnet whose N faces the falling magnet's N, so it
          <strong> pushes up</strong>. Above it, the loop's N faces the magnet's S, so it <strong>pulls up</strong>. In X-ray mode, look for the amber arrows on the tube axis.
        </>
      ) : (
        <>No current, so no induced field. Nothing opposes the fall.</>
      ),
      adv: <>Seen from above, the ring below circulates counter-clockwise and the ring above clockwise (N-pole falling first).</>,
    },
    {
      q: 'Why does this slow the magnet?',
      a: (
        <>
          Both loops push the magnet <strong>upward</strong>. That braking force is now <strong className="tabular">{Math.round(r.brakeOverWeight * 100)}%</strong> of the magnet's weight.
          {r.brakeOverWeight > 0.9
            ? ' It almost balances gravity, so the speed stays nearly constant. This is the terminal speed.'
            : moving && mat.conductive
              ? ' Gravity is still bigger, so the magnet keeps speeding up, but more and more slowly.'
              : ''}{' '}
          The faster it falls, the bigger the push, so the motion settles itself.
        </>
      ),
      adv: (
        <>
          F = k·v with k = {trajectory.summary.brakingCoefficient.toFixed(3)} N·s/m. Power turned into heat right now: P = k v² ≈ {si(s.power, 'W')}.
        </>
      ),
    },
  ];

  return (
    <div>
      <p className="mb-3 flex items-center gap-2 text-sm text-oat-300">
        <Icon name="info" size={16} />
        {playing ? 'Pause at any moment to inspect what is happening.' : `Inspecting t = ${t.toFixed(2)} s · speed ${(s.v * 100).toFixed(0)} cm/s · ${(s.y * 100).toFixed(0)} cm fallen`}
      </p>
      <div className="space-y-2">
        {qs.map((item, i) => {
          const isOpen = open === i;
          const id = `xq-${i}`;
          return (
            <div key={i} className="rounded-xl border border-espresso-700 bg-espresso-900/50">
              <h4>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={id}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 text-left text-sm font-semibold text-oat-50"
                >
                  <span className="flex items-center gap-2">
                    <Icon name="question" size={18} className="text-sage-300" />
                    {item.q}
                  </span>
                  <Icon name="arrowDown" size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
              </h4>
              {isOpen && (
                <div id={id} className="space-y-2 px-4 pb-4 text-sm text-oat-200">
                  <p>{item.a}</p>
                  {advanced && item.adv && <p className="rounded-lg bg-espresso-950/70 p-2.5 font-mono text-xs text-oat-300">{item.adv}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
