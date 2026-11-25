import { useId } from 'react';
import { MATERIALS } from '../../lib/materials';
import type { ExperimentParams, Sample } from '../../lib/physics';

/**
 * Cross-section diagram of the tube. It is the WebGL fallback, the reduced-motion alternative and the compare view.
 * Convention (shared with the 3D scene): the magnet falls N-pole first (N at the bottom).
 *  - Ring BELOW the magnet: downward flux is increasing → induced current counter-clockwise seen from above
 *    → in this front cross-section: ⊗ (into page) on the right wall, ⊙ (out of page) on the left wall. Induced N faces up → repels.
 *  - Ring ABOVE the magnet: flux decreasing → opposite circulation → ⊙ right, ⊗ left. Induced field attracts the magnet back.
 */
export function TubeDiagram2D({
  params,
  sample,
  showField = true,
  showEddy = true,
  showForces = true,
  compact = false,
  title,
}: {
  params: ExperimentParams;
  sample: Sample | null;
  showField?: boolean;
  showEddy?: boolean;
  showForces?: boolean;
  compact?: boolean;
  title?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const mat = MATERIALS[params.material];
  const W = 240;
  const H = 520;
  const top = 40;
  const bottom = H - 50;
  const cx = W / 2 + 10;
  const inner = 40 + ((params.innerDiameterMm - 13) / 17) * 50; // px
  const wall = 4 + ((params.wallMm - 0.5) / 3.5) * 16; // px
  const magW = inner * (12 / params.innerDiameterMm) * 0.98;
  const magH = Math.max(26, magW * 1.05);
  const L = params.dropHeightM;
  const y = sample?.y ?? 0;
  const travel = bottom - top - magH;
  const magTop = top + (Math.min(y, L) / L) * travel;
  const magMid = magTop + magH / 2;
  const current = mat.conductive ? Math.min(1, sample?.current ?? 0) : 0;
  const weightLen = compact ? 34 : 46;
  const brakeLen = weightLen * Math.min(1.25, (sample?.fBrake ?? 0) / (0.0102 * 9.81));
  const metalFill = mat.conductive ? mat.color : '#D8E6E2';
  const ringGap = magH * 0.95;
  const ticks = Math.round(L * 10);
  const desc = sample
    ? `${mat.name} tube. The magnet has fallen ${(y * 100).toFixed(0)} centimetres and is moving at ${(sample.v * 100).toFixed(0)} centimetres per second. ` +
      (mat.conductive
        ? `Induced eddy currents are ${current > 0.66 ? 'strong' : current > 0.25 ? 'moderate' : current > 0.02 ? 'weak' : 'not yet flowing'}; braking force is ${Math.round((sample.fBrake / (0.0102 * 9.81)) * 100)} percent of the magnet's weight.`
        : 'Plastic does not conduct, so there are no eddy currents and no braking.')
    : 'Magnet held at the top of the tube, ready to drop.';

  const eddy = (cy: number, below: boolean) => {
    // below: ⊗ right, ⊙ left ; above: ⊙ right, ⊗ left
    const op = 0.25 + current * 0.75;
    const r = compact ? 6 : 7.5;
    const xl = cx - inner / 2 - wall / 2;
    const xr = cx + inner / 2 + wall / 2;
    const dot = (x: number) => (
      <g>
        <circle cx={x} cy={cy} r={r} fill="var(--color-espresso-950)" stroke="var(--color-eddy)" strokeWidth={2} opacity={op} />
        <circle cx={x} cy={cy} r={2.4} fill="var(--color-eddy)" opacity={op} />
      </g>
    );
    const cross = (x: number) => (
      <g opacity={op}>
        <circle cx={x} cy={cy} r={r} fill="var(--color-espresso-950)" stroke="var(--color-eddy)" strokeWidth={2} />
        <path d={`M${x - r * 0.55},${cy - r * 0.55}L${x + r * 0.55},${cy + r * 0.55}M${x + r * 0.55},${cy - r * 0.55}L${x - r * 0.55},${cy + r * 0.55}`} stroke="var(--color-eddy)" strokeWidth={2} />
      </g>
    );
    // induced field arrow on the axis (up for ring below, down for ring above)
    const len = 10 + current * 12;
    const ay = below ? cy + magH * 0.15 : cy - magH * 0.15;
    const dir = below ? -1 : 1; // below → points up (towards magnet), above → points down (towards magnet)
    return (
      <g>
        {below ? (
          <>
            {dot(xl)}
            {cross(xr)}
          </>
        ) : (
          <>
            {cross(xl)}
            {dot(xr)}
          </>
        )}
        {!compact && current > 0.03 && (
          <g opacity={0.35 + current * 0.6}>
            <line x1={cx} y1={ay - (dir * len) / 2} x2={cx} y2={ay + (dir * len) / 2} stroke="var(--color-eddy)" strokeWidth={2.5} strokeDasharray="4 3" />
            <path d={`M${cx - 5},${ay + (dir * len) / 2 - dir * 6}L${cx},${ay + (dir * len) / 2}L${cx + 5},${ay + (dir * len) / 2 - dir * 6}`} fill="none" stroke="var(--color-eddy)" strokeWidth={2.5} />
          </g>
        )}
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${uid}-t ${uid}-d`} className="h-full w-full">
      <title id={`${uid}-t`}>{title ?? 'Cross-section of the tube with the falling magnet'}</title>
      <desc id={`${uid}-d`}>{desc}</desc>
      <defs>
        <linearGradient id={`${uid}-wall`} x1="0" x2="1">
          <stop offset="0" stopColor={metalFill} stopOpacity={mat.conductive ? 0.95 : 0.35} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={mat.conductive ? 0.35 : 0.2} />
          <stop offset="1" stopColor={metalFill} stopOpacity={mat.conductive ? 0.8 : 0.3} />
        </linearGradient>
        <radialGradient id={`${uid}-heat`}>
          <stop offset="0" stopColor="var(--color-heat)" stopOpacity="0.85" />
          <stop offset="1" stopColor="var(--color-heat)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* scale */}
      {!compact &&
        Array.from({ length: ticks + 1 }, (_, i) => {
          const ty = top + magH / 2 + (i / ticks) * travel;
          return (
            <g key={i} aria-hidden>
              <line x1={14} x2={i % 5 === 0 ? 30 : 24} y1={ty} y2={ty} stroke="var(--color-oat-400)" strokeWidth={1} />
              {i % 5 === 0 && (
                <text x={34} y={ty + 4} fontSize={10} fill="var(--color-oat-400)">
                  {(i * 10).toString()} cm
                </text>
              )}
            </g>
          );
        })}

      {/* start / finish gates */}
      <g aria-hidden>
        <line x1={cx - inner / 2 - wall - 10} x2={cx + inner / 2 + wall + 10} y1={top - 6} y2={top - 6} stroke="var(--color-sage-300)" strokeDasharray="3 3" />
        <line x1={cx - inner / 2 - wall - 10} x2={cx + inner / 2 + wall + 10} y1={bottom + 4} y2={bottom + 4} stroke="var(--color-sage-300)" strokeDasharray="3 3" />
        {!compact && (
          <>
            <text x={cx + inner / 2 + wall + 12} y={top - 2} fontSize={10} fill="var(--color-sage-300)">
              START
            </text>
            <text x={cx + inner / 2 + wall + 12} y={bottom + 8} fontSize={10} fill="var(--color-sage-300)">
              FINISH
            </text>
          </>
        )}
      </g>

      {/* heat glow on the walls */}
      {mat.conductive && sample && sample.power > 0 && (
        <g aria-hidden opacity={Math.min(0.9, current * 0.9)}>
          <ellipse cx={cx - inner / 2 - wall / 2} cy={magMid} rx={wall + 6} ry={magH * 1.4} fill={`url(#${uid}-heat)`} />
          <ellipse cx={cx + inner / 2 + wall / 2} cy={magMid} rx={wall + 6} ry={magH * 1.4} fill={`url(#${uid}-heat)`} />
        </g>
      )}

      {/* tube walls */}
      <rect x={cx - inner / 2 - wall} y={top} width={wall} height={bottom - top} fill={`url(#${uid}-wall)`} stroke="var(--color-oat-400)" strokeOpacity={0.5} />
      <rect x={cx + inner / 2} y={top} width={wall} height={bottom - top} fill={`url(#${uid}-wall)`} stroke="var(--color-oat-400)" strokeOpacity={0.5} />

      {/* catch tray */}
      <rect x={cx - inner / 2 - wall - 18} y={bottom + 12} width={inner + 2 * wall + 36} height={14} rx={4} fill="var(--color-espresso-600)" />

      {/* field lines (outside the magnet run from N at the bottom round to S at the top) */}
      {showField && (
        <g aria-hidden stroke="var(--color-field)" fill="none" strokeWidth={1.6} opacity={0.85}>
          {[0.9, 1.6, 2.5].map((s, i) => {
            const w = magW * s;
            const h = magH * (0.5 + s * 0.55);
            return (
              <g key={i}>
                {[-1, 1].map((side) => (
                  <g key={side}>
                    <path d={`M${cx + side * magW * 0.25},${magTop + magH} C${cx + side * w},${magTop + magH + h} ${cx + side * w},${magTop - h} ${cx + side * magW * 0.25},${magTop}`} />
                    <path
                      d={`M${cx + side * w * 0.75 - 4},${magMid + 3}L${cx + side * w * 0.75},${magMid - 4}L${cx + side * w * 0.75 + 4},${magMid + 3}`}
                      strokeWidth={2}
                    />
                  </g>
                ))}
              </g>
            );
          })}
        </g>
      )}

      {/* eddy currents */}
      {showEddy && mat.conductive && (
        <g>
          {magTop + magH + ringGap * 0.6 < bottom && eddy(magTop + magH + ringGap * 0.55, true)}
          {magTop - ringGap * 0.55 > top && eddy(magTop - ringGap * 0.55, false)}
        </g>
      )}

      {/* magnet: S on top, N at the bottom (falls N-first) */}
      <g>
        <rect x={cx - magW / 2} y={magTop} width={magW} height={magH / 2} rx={3} fill="var(--color-oat-200)" />
        <rect x={cx - magW / 2} y={magMid} width={magW} height={magH / 2} rx={3} fill="var(--color-sage-400)" />
        <text x={cx} y={magTop + magH / 4 + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-ink)">
          S
        </text>
        <text x={cx} y={magMid + magH / 4 + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-ink)">
          N
        </text>
      </g>

      {/* forces */}
      {showForces && (
        <g aria-hidden>
          <line x1={cx + magW / 2 + 22} y1={magMid} x2={cx + magW / 2 + 22} y2={magMid + weightLen} stroke="var(--color-oat-100)" strokeWidth={3} />
          <path d={`M${cx + magW / 2 + 16},${magMid + weightLen - 7}L${cx + magW / 2 + 22},${magMid + weightLen}L${cx + magW / 2 + 28},${magMid + weightLen - 7}`} fill="none" stroke="var(--color-oat-100)" strokeWidth={3} />
          {!compact && (
            <text x={cx + magW / 2 + 30} y={magMid + weightLen} fontSize={10} fill="var(--color-oat-100)">
              weight
            </text>
          )}
          {brakeLen > 2 && (
            <>
              <line x1={cx - magW / 2 - 22} y1={magMid} x2={cx - magW / 2 - 22} y2={magMid - brakeLen} stroke="var(--color-eddy)" strokeWidth={3} />
              <path d={`M${cx - magW / 2 - 28},${magMid - brakeLen + 7}L${cx - magW / 2 - 22},${magMid - brakeLen}L${cx - magW / 2 - 16},${magMid - brakeLen + 7}`} fill="none" stroke="var(--color-eddy)" strokeWidth={3} />
              {!compact && (
                <text x={cx - magW / 2 - 24} y={magMid - brakeLen - 6} fontSize={10} textAnchor="end" fill="var(--color-eddy)">
                  braking
                </text>
              )}
            </>
          )}
        </g>
      )}
    </svg>
  );
}
