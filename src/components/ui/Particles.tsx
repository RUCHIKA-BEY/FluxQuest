import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useMotionPref';
import { useSettings } from '../../store/settings';

/**
 * Subtle drifting "field dust" that follows faint dipole-like streamlines.
 * Decorative only: removed under reduced motion and Low Graphics Mode, and pauses when the tab is hidden.
 */
export function Particles({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const low = useSettings((s) => s.lowGraphics);
  useEffect(() => {
    if (reduce || low) return;
    const c = ref.current!;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(1.5, devicePixelRatio || 1);
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    const N = Math.min(70, Math.round((w * h) / 16000));
    const pts = Array.from({ length: N }, () => ({ x: Math.random() * w, y: Math.random() * h, s: 0.6 + Math.random() * 1.4, a: 0.15 + Math.random() * 0.35 }));
    let raf = 0;
    const tick = () => {
      if (document.hidden) {
        raf = requestAnimationFrame(tick);
        return;
      }
      ctx.clearRect(0, 0, w, h);
      const cx = w * 0.72;
      const cy = h * 0.5;
      for (const p of pts) {
        // dipole field direction around (cx, cy), pointing "up" the page
        const dx = p.x - cx;
        const dy = p.y - cy;
        const r2 = dx * dx + dy * dy + 4000;
        const r = Math.sqrt(r2);
        const bx = (3 * dx * -dy) / (r2 * r);
        const by = (3 * dy * -dy) / (r2 * r) + 1 / r;
        const n = Math.hypot(bx, by) || 1;
        p.x += (bx / n) * 0.35 * p.s;
        p.y += (by / n) * 0.35 * p.s;
        if (p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) {
          p.x = Math.random() * w;
          p.y = Math.random() * h;
        }
        ctx.fillStyle = `rgba(134, 207, 195, ${p.a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reduce, low]);
  if (reduce || low) return null;
  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
