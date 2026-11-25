import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Particles } from '../components/ui/Particles';
import { Button, LinkButton } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Icon, type IconName } from '../components/ui/Icon';
import { TubeDiagram2D } from '../components/lab/TubeDiagram2D';
import { href, navigate } from '../lib/router';
import { DEFAULT_PARAMS, sampleAt, simulate } from '../lib/physics';
import { hasWebGL } from '../lib/webgl';
import { useReducedMotion } from '../hooks/useMotionPref';
import { useSettings } from '../store/settings';
import { useLab } from '../store/lab';
import { IntroMovie } from './IntroMovie';

const LabScene = lazy(() => import('../components/lab/LabScene'));

const HERO_PARAMS = { ...DEFAULT_PARAMS, dropHeightM: 0.5 };

/** Looping 3D preview, or a static 2D diagram under reduced motion / low graphics / no WebGL. */
function HeroPreview() {
  const reduce = useReducedMotion();
  const low = useSettings((s) => s.lowGraphics);
  const traj = useMemo(() => simulate(HERO_PARAMS, 7, false), []);
  const [ready, setReady] = useState(false);
  // Defer the 3D chunk until the browser is idle so the page paints fast on low-end phones.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const id = w.requestIdleCallback ? w.requestIdleCallback(() => setReady(true)) : window.setTimeout(() => setReady(true), 600);
    return () => clearTimeout(id);
  }, []);
  const loopT = useMemo(() => {
    const T = traj.summary.fallTime + 1.2;
    const start = performance.now();
    return () => Math.min(traj.summary.fallTime, (((performance.now() - start) / 1000) % T) - 0.4);
  }, [traj]);

  const static2D = (
    <div className="mx-auto h-full max-w-[260px]">
      <TubeDiagram2D params={HERO_PARAMS} sample={sampleAt(traj, traj.summary.fallTime * 0.55)} title="A magnet falling slowly through a copper tube, with eddy currents and field lines" />
    </div>
  );
  if (reduce || low || !hasWebGL() || !ready) return static2D;
  return (
    <Suspense fallback={static2D}>
      <LabScene
        params={HERO_PARAMS}
        trajectory={traj}
        getTime={loopT}
        showField
        showEddy
        showForces={false}
        xray
        camera="side"
        lowGraphics={false}
        reducedMotion={false}
        autoRotate
        interactive={false}
      />
    </Suspense>
  );
}

const JOURNEY: { icon: IconName; step: string; title: string; text: string; to: Parameters<typeof href>[0] }[] = [
  { icon: 'target', step: '1', title: 'Predict', text: 'Commit to an answer before you see anything. Which tube is fastest?', to: 'predict' },
  { icon: 'flask', step: '2', title: 'Experiment', text: 'Drop the same magnet through plastic, aluminium, copper and brass in the 3D lab.', to: 'lab' },
  { icon: 'xray', step: '3', title: 'See the invisible', text: 'X-Ray mode reveals eddy currents, field lines and the braking force in slow motion.', to: 'lab' },
  { icon: 'layers', step: '4', title: 'Test fairly', text: 'Change exactly one thing at a time: material, wall thickness or diameter.', to: 'variables' },
  { icon: 'chart', step: '5', title: 'Use evidence', text: 'Compare your results, spot patterns and check your predictions.', to: 'results' },
  { icon: 'book', step: '6', title: 'Explain', text: 'Learn Faraday’s and Lenz’s laws, then try it on the real Lazy Tube.', to: 'learn' },
];

const PROBLEMS = [
  { code: 'P021', title: 'Comparing fall times fairly', text: 'Same magnet, same release gate, same height, with repeatable timing between start and finish gates.' },
  { code: 'P022', title: 'Making hidden motion understandable', text: 'X-ray views, live graphs and a 2D cross-section show the magnet and the invisible currents. We never cut the tube.' },
  { code: 'P023', title: 'Testing what changes braking', text: 'The Variable Lab locks every setting except the one you are testing.' },
];

export default function Home() {
  const [intro, setIntro] = useState(false);
  const reduce = useReducedMotion();
  const { introSeen, set } = useSettings();
  const runs = useLab((s) => s.runs.length);
  return (
    <>
      <section aria-labelledby="hero-title" className="relative overflow-hidden">
        <Particles />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div>
            <motion.p className="fq-eyebrow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              The Slow-Motion Magnet · Seeing the Invisible Force
            </motion.p>
            <motion.h1 id="hero-title" className="fq-h1 mt-4 text-oat-50" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.6 }}>
              Why does a magnet fall <span className="italic text-sage-300">slowly</span> through metal?
            </motion.h1>
            <motion.p className="mt-5 max-w-xl text-lg text-oat-200" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.6 }}>
              Drop a magnet down a plastic tube and it whooshes straight through. Drop it down a copper tube and it drifts like a feather, yet copper isn’t even magnetic. The answer
              is a force you can’t see. Let’s make it visible.
            </motion.p>
            <motion.div className="mt-8 flex flex-wrap gap-3" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.6 }}>
              <LinkButton variant="primary" size="lg" href={href(runs ? 'lab' : 'predict')} iconRight="arrowRight">
                Start the Experiment
              </LinkButton>
              <Button
                size="lg"
                icon="play"
                onClick={() => {
                  setIntro(true);
                  set({ introSeen: true });
                }}
              >
                Watch the Invisible Force
              </Button>
            </motion.div>
            <p className="mt-4 text-sm text-oat-400">
              {introSeen ? 'Ages 10–16 · works offline · no sign-up' : 'New here? The 30-second intro sets up the mystery.'}
            </p>
          </div>
          <motion.div
            className="relative h-[420px] overflow-hidden rounded-[28px] border border-espresso-700 bg-[#1A130F] sm:h-[520px]"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            <HeroPreview />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-espresso-950 to-transparent p-4 pt-12 text-sm text-oat-200">
              <span className="font-semibold text-oat-50">X-ray preview:</span> amber eddy-current rings form just above and below the magnet in a copper tube.
            </div>
          </motion.div>
        </div>
      </section>

      <section aria-labelledby="journey" className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 id="journey" className="fq-h2 text-oat-50">
          Your investigation
        </h2>
        <p className="mt-2 max-w-2xl text-oat-300">Six steps, the way real scientists work. Each step unlocks a deeper look at the invisible force.</p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {JOURNEY.map((j, i) => (
            <motion.li
              key={j.title}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.06, duration: 0.45 }}
            >
              <a href={href(j.to)} className="group block h-full">
                <Card className="h-full p-5 transition-[transform,border-color] duration-200 group-hover:-translate-y-1 group-hover:border-sage-500">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sage-400/15 text-sage-300">
                      <Icon name={j.icon} size={22} />
                    </span>
                    <span className="font-mono text-sm text-oat-400">Step {j.step}</span>
                  </div>
                  <h3 className="fq-h3 mt-4 text-oat-50">{j.title}</h3>
                  <p className="mt-1 text-oat-300">{j.text}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-sage-300">
                    Go <Icon name="arrowRight" size={16} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </Card>
              </a>
            </motion.li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="problems" className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <h2 id="problems" className="fq-h2 text-oat-50">
          Built to solve three real classroom problems
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {PROBLEMS.map((p) => (
            <Card key={p.code} className="p-5">
              <p className="font-mono text-sm font-semibold text-eddy">{p.code}</p>
              <h3 className="fq-h3 mt-1 text-oat-50">{p.title}</h3>
              <p className="mt-2 text-oat-300">{p.text}</p>
            </Card>
          ))}
        </div>
        <Card className="mt-6 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
          <Icon name="magnet" size={32} className="text-sage-300" />
          <p className="flex-1 text-oat-200">
            <strong className="text-oat-50">Have the real Agastya Lazy Tube model?</strong> FluxQuest supports hands-on exploration and doesn't replace it. Use the companion guide for a fair-test procedure and a printable observation
            table.
          </p>
          <LinkButton href={href('model')} iconRight="arrowRight">
            Real model guide
          </LinkButton>
        </Card>
      </section>
      <IntroMovie
        open={intro}
        onClose={() => setIntro(false)}
        onStart={() => {
          setIntro(false);
          navigate('predict');
        }}
      />
    </>
  );
}
