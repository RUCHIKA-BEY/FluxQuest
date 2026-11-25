import { useEffect, useState } from 'react';
import { useSettings } from '../store/settings';

const query = '(prefers-reduced-motion: reduce)';

export function useSystemReducedMotion() {
  const [reduce, setReduce] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setReduce(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduce;
}

/** True when motion should be reduced (OS setting unless the user overrode it in FluxQuest settings). */
export function useReducedMotion() {
  const pref = useSettings((s) => s.motion);
  const system = useSystemReducedMotion();
  return pref === 'reduce' || (pref === 'system' && system);
}
