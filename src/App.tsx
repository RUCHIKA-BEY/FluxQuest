import { lazy, Suspense, useEffect } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Announcer } from './components/layout/Announcer';
import { useRoute, type RouteName } from './lib/router';
import { useSettings } from './store/settings';
import { useReducedMotion } from './hooks/useMotionPref';
import Home from './sections/Home';

const Predict = lazy(() => import('./sections/Predict'));
const Lab = lazy(() => import('./sections/Lab'));
const VariableLab = lazy(() => import('./sections/VariableLab'));
const Results = lazy(() => import('./sections/Results'));
const Learn = lazy(() => import('./sections/Learn'));
const RealModel = lazy(() => import('./sections/RealModel'));
const Magneto = lazy(() => import('./chat/Magneto'));

const VIEWS: Record<RouteName, React.ComponentType> = {
  home: Home,
  predict: Predict,
  lab: Lab,
  variables: VariableLab,
  results: Results,
  learn: Learn,
  model: RealModel,
};

const TITLES: Record<RouteName, string> = {
  home: 'FluxQuest: The Slow-Motion Magnet',
  predict: 'Predict Before You See · FluxQuest',
  lab: '3D Virtual Lab · FluxQuest',
  variables: 'Variable Lab · FluxQuest',
  results: 'Results and Evidence · FluxQuest',
  learn: 'Learn the Physics · FluxQuest',
  model: 'Real Agastya Model Companion · FluxQuest',
};

function Loading() {
  return (
    <div role="status" className="flex min-h-[50vh] items-center justify-center text-oat-300">
      <span className="mr-3 inline-block h-5 w-5 animate-spin rounded-full border-2 border-sage-400 border-t-transparent" aria-hidden />
      Loading…
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const { highContrast, textScale } = useSettings();
  const reduce = useReducedMotion();
  const View = VIEWS[route.name];

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.contrast = highContrast ? 'high' : 'normal';
    el.dataset.motion = reduce ? 'reduce' : 'full';
    el.style.fontSize = `${textScale * 100}%`;
  }, [highContrast, reduce, textScale]);

  // Route change: update title, scroll to top and move focus to the page heading for screen readers.
  useEffect(() => {
    document.title = TITLES[route.name];
    window.scrollTo({ top: 0, behavior: 'auto' });
    const t = setTimeout(() => {
      const h = document.querySelector<HTMLElement>('main h1');
      if (h && route.name !== 'home') {
        h.setAttribute('tabindex', '-1');
        h.focus({ preventScroll: true });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [route.name]);

  return (
    <MotionConfig reducedMotion={reduce ? 'always' : 'never'}>
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
        className="sr-only z-[100] rounded-lg bg-sage-400 px-4 py-3 font-semibold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="outline-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={route.name}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: reduce ? 0.15 : 0.35, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Suspense fallback={<Loading />}>
              <View />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <Suspense fallback={null}>
        <Magneto />
      </Suspense>
      <Announcer />
    </MotionConfig>
  );
}
