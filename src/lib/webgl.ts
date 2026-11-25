let cached: boolean | null = null;

/** True if a WebGL context can be created. Cached after the first call. */
export function hasWebGL(): boolean {
  if (cached !== null) return cached;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    cached = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}

/** Heuristic for low-end devices: few cores, little memory, or a save-data request. */
export function isLikelyLowEnd(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 3 || !!nav.connection?.saveData;
}
