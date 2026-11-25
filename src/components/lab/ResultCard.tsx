import type React from 'react';
import { motion } from 'framer-motion';
import { MATERIALS } from '../../lib/materials';
import type { Trajectory } from '../../lib/physics';
import { fmtSpeed } from '../../lib/format';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { Badge } from '../ui/Card';
import { Icon } from '../ui/Icon';

const LABEL_TONE = { none: 'neutral', weak: 'field', moderate: 'sage', strong: 'current', 'very strong': 'current' } as const;

/** The dramatic reveal after a drop. */
export function ResultCard({ trajectory, runNumber, evidence }: { trajectory: Trajectory; runNumber?: number; evidence?: React.ReactNode }) {
  const s = trajectory.summary;
  const mat = MATERIALS[trajectory.params.material];
  return (
    <motion.section
      aria-label="Result of the drop"
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', damping: 18, stiffness: 180 }}
      className="fq-card relative overflow-hidden p-5"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sage-400/15 blur-3xl" aria-hidden />
      <p className="fq-eyebrow">Result{runNumber ? ` · Run #${runNumber}` : ''}</p>
      <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-1">
        <p className="font-display text-5xl font-bold text-oat-50">
          <AnimatedNumber value={s.fallTime} format={(v) => v.toFixed(2)} />
          <span className="ml-1 text-2xl text-oat-300">s</span>
        </p>
        <p className="pb-2 text-sm text-oat-300">
          to fall {trajectory.params.dropHeightM.toFixed(1)} m through {mat.name.toLowerCase()}
        </p>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-oat-400">Free fall would take</dt>
          <dd className="tabular font-semibold text-oat-50">{s.freeFallTime.toFixed(2)} s</dd>
        </div>
        <div>
          <dt className="text-oat-400">Slower by</dt>
          <dd className="tabular font-semibold text-oat-50">×{s.slowdownFactor.toFixed(1)}</dd>
        </div>
        <div>
          <dt className="text-oat-400">Average speed</dt>
          <dd className="tabular font-semibold text-oat-50">{fmtSpeed(s.avgSpeed)}</dd>
        </div>
        <div>
          <dt className="text-oat-400">Braking</dt>
          <dd>
            <Badge tone={LABEL_TONE[s.brakingLabel]}>{s.brakingLabel}</Badge>
          </dd>
        </div>
      </dl>
      <p className="mt-3 flex items-center gap-2 text-sm text-oat-300">
        <Icon name="flame" size={16} className="text-heat" />
        {mat.conductive ? `${Math.round(s.heatFraction * 100)}% of the lost height energy became heat in the tube wall.` : 'No eddy currents, so almost all the height energy became motion.'}
      </p>
      {evidence && <div className="mt-4 border-t border-espresso-700 pt-4">{evidence}</div>}
    </motion.section>
  );
}
