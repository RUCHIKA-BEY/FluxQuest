import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useMotionPref';

/** Counts up to a value (ease-out). Screen readers get the final value only. */
export function AnimatedNumber({ value, format = (v) => v.toFixed(2), duration = 900 }: { value: number; format?: (v: number) => string; duration?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(0);
  useEffect(() => {
    if (reduce || !Number.isFinite(value)) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const v0 = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(v0 + (value - v0) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce, duration]);
  return (
    <>
      <span aria-hidden className="tabular">
        {format(shown)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
