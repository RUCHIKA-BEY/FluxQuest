import { SPEEDS, usePlayback, type Speed } from '../../store/playback';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Controls';

export function PlaybackBar({ duration, onRun, canRun }: { duration: number | null; onRun: () => void; canRun: boolean }) {
  const { t, playing, speed, set } = usePlayback();
  const has = duration != null;
  const done = has && t >= duration - 1e-6;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="lg" icon="play" onClick={onRun} disabled={!canRun} className="flex-1 sm:flex-none">
          Drop the magnet
        </Button>
        <Button
          icon={playing ? 'pause' : 'play'}
          disabled={!has || done}
          onClick={() => set({ playing: !playing })}
          aria-label={playing ? 'Pause playback' : 'Resume playback'}
        >
          {playing ? 'Pause' : 'Resume'}
        </Button>
        <Button icon="replay" disabled={!has} onClick={() => set({ t: 0, tCoarse: 0, playing: true })}>
          Replay
        </Button>
      </div>
      <Segmented<Speed>
        label="Replay speed"
        size="sm"
        value={speed}
        onChange={(s) => set({ speed: s })}
        options={SPEEDS.map((s) => ({ value: s, label: s === 1 ? 'Real time' : `${s}×`, ariaLabel: s === 1 ? 'Real time' : `${s} times speed, slow motion` }))}
      />
      <div>
        <label htmlFor="scrub" className="flex justify-between text-xs text-oat-300">
          <span>Timeline (drag to inspect any moment)</span>
          <span className="tabular text-oat-100">
            {t.toFixed(2)} / {has ? duration!.toFixed(2) : '—'} s
          </span>
        </label>
        <input
          id="scrub"
          type="range"
          className="fq-range"
          min={0}
          max={has ? duration! : 1}
          step={0.005}
          value={has ? t : 0}
          disabled={!has}
          aria-valuetext={`${t.toFixed(2)} seconds of ${has ? duration!.toFixed(2) : 0}`}
          style={{ ['--fill' as string]: `${has ? (t / duration!) * 100 : 0}%` }}
          onChange={(e) => {
            const v = Number(e.target.value);
            set({ t: v, tCoarse: v, playing: false });
          }}
        />
      </div>
    </div>
  );
}
