import type React from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { useReducedMotion } from '../hooks/useMotionPref';

export const INTRO_SCENES = [
  { caption: 'Two tubes. The same magnet. The same height.', sub: 'One tube is plastic. The other is copper.' },
  { caption: 'Plastic: the magnet zooms through in about half a second.', sub: 'That is almost free fall, as if the tube were not there.' },
  { caption: 'Copper: the magnet drifts down slowly, as if through honey.', sub: 'But copper is not magnetic! A magnet does not stick to it.' },
  { caption: 'The secret: the moving magnet makes the field inside the metal change.', sub: 'The changing field pushes electrons into swirling loops called eddy currents.' },
  { caption: 'Those swirling currents become magnets themselves, and they push back.', sub: 'This is Lenz’s law: induced currents always oppose the change that made them.' },
  { caption: 'The magnet’s energy turns into a tiny bit of heat in the copper.', sub: 'Your mission: predict, test and see the invisible force for yourself.' },
];

const SCENE_MS = 5000;

function Tube({ x, copper, children }: { x: number; copper?: boolean; children?: React.ReactNode }) {
  return (
    <g>
      <rect x={x - 22} y={30} width={44} height={240} rx={6} fill={copper ? '#C8794B33' : '#D8E6E21f'} stroke={copper ? '#C8794B' : '#BFAE93'} strokeWidth={4} />
      <text x={x} y={292} textAnchor="middle" fontSize={14} fill="#E3D7C1" fontWeight={600}>
        {copper ? 'Copper' : 'Plastic'}
      </text>
      {children}
    </g>
  );
}

function Magnet({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 14} ${y})`}>
      <rect width={28} height={13} rx={3} fill="#E3D7C1" />
      <rect y={13} width={28} height={13} rx={3} fill="#9DBB8C" />
      <text x={14} y={10.5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#16100D">S</text>
      <text x={14} y={23.5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#16100D">N</text>
    </g>
  );
}

function Scene({ i, reduce }: { i: number; reduce: boolean }) {
  const ease = { duration: reduce ? 0 : 0.6, ease: [0.2, 0.8, 0.2, 1] as const };
  const fall = (dur: number) => (reduce ? { duration: 0 } : { duration: dur, ease: dur < 1 ? ('easeIn' as const) : ('linear' as const) });
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden>
      {i === 0 && (
        <>
          <Tube x={130} />
          <Tube x={270} copper />
          <motion.g initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={ease}>
            <Magnet x={130} y={34} />
            <Magnet x={270} y={34} />
          </motion.g>
        </>
      )}
      {i === 1 && (
        <>
          <Tube x={130} />
          <Tube x={270} copper />
          <motion.g initial={{ y: 0 }} animate={{ y: reduce ? 210 : [0, 210] }} transition={fall(0.6)}>
            <Magnet x={130} y={34} />
          </motion.g>
          <Magnet x={270} y={34} />
          <motion.text x={130} y={22} textAnchor="middle" fontSize={16} fontWeight={700} fill="#A6E3A1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 0.7 }}>
            0.45 s!
          </motion.text>
        </>
      )}
      {i === 2 && (
        <>
          <Tube x={130} />
          <Magnet x={130} y={244} />
          <Tube x={270} copper />
          <motion.g initial={{ y: 0 }} animate={{ y: reduce ? 90 : 160 }} transition={fall(4.6)}>
            <Magnet x={270} y={34} />
          </motion.g>
          <text x={330} y={150} fontSize={22} fill="#F0B062">?</text>
        </>
      )}
      {i === 3 && (
        <>
          <Tube x={200} copper />
          <Magnet x={200} y={120} />
          {[-1, 1].map((s) => (
            <motion.path
              key={s}
              d={`M${200 + s * 14},120 C${200 + s * 80},90 ${200 + s * 80},170 ${200 + s * 14},146`}
              fill="none"
              stroke="#86CFC3"
              strokeWidth={2.5}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reduce ? 0 : 1.2 }}
            />
          ))}
          {[85, 185].map((y, k) => (
            <motion.ellipse
              key={y}
              cx={200}
              cy={y}
              rx={30}
              ry={8}
              fill="none"
              stroke="#F0B062"
              strokeWidth={4}
              className="fq-current-flow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.8 + k * 0.3 }}
            />
          ))}
          <text x={245} y={90} fontSize={12} fill="#F0B062">eddy current</text>
          <text x={245} y={190} fontSize={12} fill="#F0B062">eddy current</text>
        </>
      )}
      {i === 4 && (
        <>
          <Tube x={200} copper />
          <Magnet x={200} y={120} />
          <ellipse cx={200} cy={185} rx={30} ry={8} fill="none" stroke="#F0B062" strokeWidth={4} className="fq-current-flow" />
          <ellipse cx={200} cy={85} rx={30} ry={8} fill="none" stroke="#F0B062" strokeWidth={4} className="fq-current-flow" />
          <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={ease}>
            <path d="M200 230 L200 160 M190 172 L200 160 L210 172" stroke="#F0B062" strokeWidth={4} fill="none" />
            <text x={215} y={225} fontSize={12} fill="#F0B062">push up</text>
            <path d="M200 70 L200 100 M190 90 L200 102 L210 90" stroke="#F0B062" strokeWidth={4} fill="none" transform="rotate(180 200 86)" />
            <text x={215} y={70} fontSize={12} fill="#F0B062">pull up</text>
          </motion.g>
          <text x={60} y={150} fontSize={13} fill="#E3D7C1">gravity ↓</text>
        </>
      )}
      {i === 5 && (
        <>
          <Tube x={200} copper>
            <motion.rect x={176} y={100} width={48} height={80} rx={6} fill="#E86A4A" initial={{ opacity: 0 }} animate={{ opacity: reduce ? 0.35 : [0, 0.45, 0.25] }} transition={{ duration: 2 }} />
          </Tube>
          <Magnet x={200} y={128} />
          <text x={255} y={145} fontSize={13} fill="#F08A6C">a little warm</text>
          <motion.text x={200} y={22} textAnchor="middle" fontSize={16} fontWeight={700} fill="#B5CDA8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 0.8 }}>
            Let’s investigate!
          </motion.text>
        </>
      )}
    </svg>
  );
}

/** A 30-second captioned intro (6 × 5 s). Under reduced motion it never auto-advances. */
export function IntroMovie({ open, onClose, onStart }: { open: boolean; onClose: () => void; onStart: () => void }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(!reduce);
  const [transcript, setTranscript] = useState(false);
  useEffect(() => {
    if (open) {
      setI(0);
      setPlaying(!reduce);
    }
  }, [open, reduce]);
  useEffect(() => {
    if (!open || !playing) return;
    const id = setTimeout(() => (i < INTRO_SCENES.length - 1 ? setI(i + 1) : setPlaying(false)), SCENE_MS);
    return () => clearTimeout(id);
  }, [open, playing, i]);
  const s = INTRO_SCENES[i];
  return (
    <Dialog open={open} onClose={onClose} title="The mystery of the slow magnet" wide>
      <div className="grid gap-5 md:grid-cols-[1fr_300px]">
        <div className="aspect-[4/3] rounded-xl bg-espresso-950 p-2">
          <Scene key={i} i={i} reduce={reduce} />
        </div>
        <div className="flex flex-col">
          <p className="fq-eyebrow">
            Scene {i + 1} of {INTRO_SCENES.length}
          </p>
          <div aria-live="polite" className="mt-2 min-h-[150px]">
            <p className="font-display text-xl font-bold text-oat-50">{s.caption}</p>
            <p className="mt-2 text-oat-200">{s.sub}</p>
          </div>
          <div className="mt-2 flex gap-1" aria-hidden>
            {INTRO_SCENES.map((_, k) => (
              <span key={k} className="h-1.5 flex-1 overflow-hidden rounded-full bg-espresso-700">
                <span
                  className="block h-full bg-sage-400"
                  style={{
                    width: k < i ? '100%' : k === i ? (playing ? '100%' : '50%') : '0%',
                    transition: k === i && playing ? `width ${SCENE_MS}ms linear` : 'none',
                  }}
                />
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" icon="arrowRight" className="rotate-180" aria-label="Previous scene" disabled={i === 0} onClick={() => setI(i - 1)} />
            <Button size="sm" icon={playing ? 'pause' : 'play'} onClick={() => setPlaying(!playing)}>
              {playing ? 'Pause' : 'Play'}
            </Button>
            <Button size="sm" icon="arrowRight" aria-label="Next scene" disabled={i === INTRO_SCENES.length - 1} onClick={() => setI(i + 1)} />
          </div>
          <Button variant="primary" className="mt-auto pt-0" iconRight="arrowRight" onClick={onStart}>
            Start the experiment
          </Button>
        </div>
      </div>
      <button type="button" className="mt-4 text-sm font-semibold text-sage-300 underline underline-offset-4" aria-expanded={transcript} onClick={() => setTranscript(!transcript)}>
        {transcript ? 'Hide' : 'Show'} full transcript
      </button>
      {transcript && (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-oat-200">
          {INTRO_SCENES.map((x) => (
            <li key={x.caption}>
              {x.caption} {x.sub}
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  );
}
