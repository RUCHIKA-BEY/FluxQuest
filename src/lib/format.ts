export const fmtTime = (s: number) => (s >= 10 ? s.toFixed(1) : s.toFixed(2)) + ' s';
export const fmtSpeed = (v: number) => (v < 1 ? `${(v * 100).toFixed(0)} cm/s` : `${v.toFixed(2)} m/s`);
export const fmtNum = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : '∞');
export const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Engineering-style formatting with SI prefix, e.g. 0.00042 V → "0.42 mV". */
export function si(x: number, unit: string, digits = 2) {
  if (!Number.isFinite(x)) return '∞ ' + unit;
  const abs = Math.abs(x);
  const prefixes: [number, string][] = [
    [1, ''],
    [1e-3, 'm'],
    [1e-6, 'µ'],
    [1e-9, 'n'],
  ];
  for (const [f, p] of prefixes) if (abs >= f) return `${(x / f).toFixed(digits)} ${p}${unit}`;
  return `${(x / 1e-9).toFixed(digits)} n${unit}`;
}
