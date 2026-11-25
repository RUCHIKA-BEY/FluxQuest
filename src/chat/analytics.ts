/** Anonymous, local-only usage counters (no question text, no identity). Viewable in Settings → Teacher view. */
export interface Analytics {
  questions: number;
  lowConfidence: number;
  failedRetrievals: number;
  offline: number;
  feedbackDown: number;
  topics: Record<string, number>;
}
const KEY = 'fq-magneto-analytics';
const empty = (): Analytics => ({ questions: 0, lowConfidence: 0, failedRetrievals: 0, offline: 0, feedbackDown: 0, topics: {} });

export function getAnalytics(): Analytics {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return empty();
  }
}
export function track(patch: Partial<Record<Exclude<keyof Analytics, 'topics'>, number>> & { topic?: string }) {
  try {
    const a = getAnalytics();
    for (const [k, v] of Object.entries(patch)) if (k !== 'topic' && typeof v === 'number') (a as unknown as Record<string, number>)[k] += v;
    if (patch.topic) a.topics[patch.topic] = (a.topics[patch.topic] ?? 0) + 1;
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* storage unavailable */
  }
}
export function clearAnalytics() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
