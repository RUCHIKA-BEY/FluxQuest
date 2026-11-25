import { MAGNET, G, sampleAt, type Trajectory } from '../../lib/physics';
import { usePlayback } from '../../store/playback';

/** Where the lost gravitational energy goes: kinetic energy vs heat in the tube. */
export function EnergyBar({ trajectory }: { trajectory: Trajectory | null }) {
  const t = usePlayback((s) => s.t);
  if (!trajectory) return null;
  const s = sampleAt(trajectory, t);
  const total = MAGNET.massKg * G * trajectory.params.dropHeightM;
  const ke = s.ke / total;
  const heat = s.heat / total;
  const left = Math.max(0, 1 - ke - heat);
  const mJ = (x: number) => (x * 1000).toFixed(1);
  return (
    <figure>
      <figcaption className="mb-2 text-sm font-semibold text-oat-100">Energy story</figcaption>
      <div className="flex h-5 w-full gap-[2px] overflow-hidden rounded-md bg-espresso-900" role="img" aria-label={`Gravitational energy still stored ${Math.round(left * 100)} percent, kinetic energy ${Math.round(ke * 100)} percent, heat in the tube ${Math.round(heat * 100)} percent.`}>
        <div className="h-full rounded-l-sm bg-oat-400/60 transition-[width] duration-100" style={{ width: `${left * 100}%` }} />
        <div className="h-full bg-field transition-[width] duration-100" style={{ width: `${ke * 100}%` }} />
        <div className="h-full rounded-r-sm bg-[repeating-linear-gradient(45deg,var(--color-heat)_0_6px,#c4573a_6px_9px)] transition-[width] duration-100" style={{ width: `${heat * 100}%` }} />
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="flex items-center gap-1.5 text-oat-300">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-oat-400/60" aria-hidden /> Height energy left
          </dt>
          <dd className="tabular font-semibold text-oat-50">{mJ(left * total)} mJ</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-oat-300">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-field" aria-hidden /> Motion (KE)
          </dt>
          <dd className="tabular font-semibold text-oat-50">{mJ(s.ke)} mJ</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-oat-300">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-heat" aria-hidden /> Heat in tube
          </dt>
          <dd className="tabular font-semibold text-oat-50">{mJ(s.heat)} mJ</dd>
        </div>
      </dl>
    </figure>
  );
}
