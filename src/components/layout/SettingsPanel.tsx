import { useSettings, type MotionPref } from '../../store/settings';
import { Dialog } from '../ui/Dialog';
import { Segmented, Toggle } from '../ui/Controls';
import { useSystemReducedMotion } from '../../hooks/useMotionPref';
import { getAnalytics, clearAnalytics } from '../../chat/analytics';
import { Button } from '../ui/Button';
import { useState } from 'react';

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings();
  const system = useSystemReducedMotion();
  const [stats, setStats] = useState(() => getAnalytics());
  return (
    <Dialog open={open} onClose={onClose} title="Display & accessibility">
      <div className="space-y-5">
        <Segmented<MotionPref>
          label="Motion"
          value={s.motion}
          onChange={(motion) => s.set({ motion })}
          options={[
            { value: 'system', label: `Device (${system ? 'reduced' : 'full'})` },
            { value: 'reduce', label: 'Reduced' },
            { value: 'full', label: 'Full' },
          ]}
        />
        <p className="-mt-3 text-xs text-oat-400">
          Reduced motion removes floating particles, auto-rotation, confetti and parallax. Science animations still play when you press Run, more slowly.
        </p>
        <Toggle label="High contrast" description="Black background, bright yellow accents, thicker outlines." checked={s.highContrast} onChange={(highContrast) => s.set({ highContrast })} />
        <Toggle
          label="Low graphics mode"
          description="For older phones: fewer field lines, no shadows or particles, lower resolution 3D."
          checked={s.lowGraphics}
          onChange={(lowGraphics) => s.set({ lowGraphics })}
        />
        <Toggle label="Advanced Physics mode" description="Show equations, SI values and deeper explanations." checked={s.advanced} onChange={(advanced) => s.set({ advanced })} />
        <Segmented
          label="Text size"
          value={s.textScale}
          onChange={(textScale) => s.set({ textScale })}
          options={[
            { value: 1, label: 'A', ariaLabel: 'Normal text' },
            { value: 1.125, label: 'A+', ariaLabel: 'Large text' },
            { value: 1.25, label: 'A++', ariaLabel: 'Extra large text' },
          ]}
        />
        <details className="rounded-xl border border-espresso-700 p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-oat-100">Teacher view: anonymous Magneto usage on this device</summary>
          <p className="mt-2 text-xs text-oat-400">Counts only. No names, no question text and nothing leaves this device.</p>
          <ul className="mt-2 space-y-1 text-oat-200">
            <li>Questions asked: {stats.questions}</li>
            <li>Low-confidence answers: {stats.lowConfidence}</li>
            <li>Failed retrievals: {stats.failedRetrievals}</li>
            <li>Offline answers: {stats.offline}</li>
            <li>Top topics: {Object.entries(stats.topics).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} (${v})`).join(', ') || '—'}</li>
          </ul>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => { clearAnalytics(); setStats(getAnalytics()); }}>
            Clear counts
          </Button>
        </details>
      </div>
    </Dialog>
  );
}
