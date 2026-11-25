/**
 * Magneto's orchestrator:
 *   sanitize → safety screen → level/language detection → hybrid retrieval → confidence gate
 *   → online (server SSE + Claude) or offline (reviewed FAQ / composed from passages)
 *   → experiment insight + in-app actions + citations.
 */
import { retrieve, type RetrievalResult } from './retrieval';
import { PASSAGES, type ActionId, type Passage } from './knowledge/passages';
import { SOURCES } from './knowledge/sources';
import { FAQS } from './knowledge/faq';
import { redact, sanitize, screen } from './safety';
import { experimentInsight } from './insight';
import { snapshot } from './experimentContext';
import { track } from './analytics';
import type { ChatMessage, Lang, Level, SourceRef } from './store';

export type ConcreteLevel = Exclude<Level, 'auto'>;

export type EngineEvent =
  | { type: 'meta'; sources: SourceRef[]; actions: ActionId[]; confidence: 'high' | 'medium' | 'low'; mode: ChatMessage['mode']; level: ConcreteLevel; followUp?: string }
  | { type: 'delta'; text: string }
  | { type: 'done' };

/** Detect the explanation level the student is asking for. */
export function detectLevel(q: string, pref: Level): ConcreteLevel {
  const s = q.toLowerCase();
  if (/like i'?m (5|6|7|8|9|10|11|12)|simple|simply|easy|kid|basic|सरल|आसान/.test(s)) return 'simple';
  if (/college|university|derivation|derive|mathemati|equation|formula|prove|proof|expert|advanced|integral|calculus/.test(s)) return 'expert';
  if (pref !== 'auto') return pref;
  if (/calculate|how much|quantitative|compare|why does .* more|difference between/.test(s)) return 'detailed';
  return s.split(/\s+/).length <= 6 ? 'simple' : 'detailed';
}

export const detectLang = (q: string, pref: Lang): Lang => (/[ऀ-ॿ]/.test(q) ? 'hi' : pref);

export function toSourceRefs(passages: Passage[]): SourceRef[] {
  return passages.map((p, i) => {
    const s = SOURCES[p.sourceId];
    return {
      n: i + 1,
      passageId: p.id,
      title: p.title,
      section: p.section,
      evidence: p.evidence,
      sourceTitle: s.title,
      org: s.org,
      url: s.url,
      citation: s.citation,
    };
  });
}

function actionsFrom(r: RetrievalResult, extra: ActionId[] = []): ActionId[] {
  const set = new Set<ActionId>(extra);
  if (r.faq?.faq.actions) r.faq.faq.actions.forEach((a) => set.add(a));
  r.results.slice(0, 3).forEach((x) => x.passage.actions?.forEach((a) => set.add(a)));
  return [...set].slice(0, 3);
}

/* ───────── Cache for online answers (offline replay of common questions) ───────── */
const CACHE_KEY = 'fq-magneto-cache';
const cacheKey = (q: string, level: string, lang: string) => `${level}|${lang}|${q.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').trim()}`;
function readCache(): Record<string, { text: string; ids: string[] }> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
  } catch {
    return {};
  }
}
function writeCache(k: string, v: { text: string; ids: string[] }) {
  try {
    const c = readCache();
    c[k] = v;
    const keys = Object.keys(c);
    if (keys.length > 60) delete c[keys[0]];
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

/* ───────── Offline composition ───────── */
function firstSentences(text: string, n = 2) {
  const parts = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return parts.slice(0, n).join(' ').trim();
}

function composeOffline(r: RetrievalResult, level: ConcreteLevel, lang: Lang): { text: string; ids: string[]; followUp?: string } {
  if (r.faq) {
    const f = r.faq.faq;
    let text = lang === 'hi' && f.hi ? f.hi : f[level];
    if (lang === 'hi' && !f.hi) text = '_(हिंदी उत्तर अभी उपलब्ध नहीं है। Hindi version not available yet; here it is in English.)_\n\n' + text;
    if (lang === 'hi' && f.hi && level !== 'simple') text += '\n\n---\n' + f[level];
    // Cite FAQ sources in order
    return { text, ids: f.sources, followUp: f.followUp };
  }
  const top = r.results.slice(0, level === 'simple' ? 2 : 3).map((x) => x.passage);
  const lines = top.map((p, i) => `- **${p.title}:** ${firstSentences(p.text, level === 'expert' ? 4 : 2)} [S${i + 1}]`);
  return {
    text: `Here’s what the verified FluxQuest notes say:\n\n${lines.join('\n')}`,
    ids: top.map((p) => p.id),
    followUp: 'Want me to go deeper, or show this in the lab?',
  };
}

function lowConfidenceReply(r: RetrievalResult, lang: Lang) {
  const offTopic = r.unknownTerms.length >= Math.max(2, Math.ceil(r.unknownTerms.length / 2));
  const en =
    `I’m not confident enough to answer this from the verified project materials.\n\n` +
    (offTopic
      ? `I’m a tutor for **magnets, induction, eddy currents and the Lazy Tube experiment**, so this seems outside what I know. A teacher, a library or a trusted encyclopedia is a better place for it.`
      : `Could you tell me a bit more? For example, is your question about **the copper tube**, **the X-ray view**, or **your own results**?\n\nFor deeper reading, try *OpenStax University Physics Vol. 2, Chapter 13 (Electromagnetic Induction)*.`);
  const hi = `मुझे सत्यापित सामग्री के आधार पर इसका भरोसेमंद उत्तर नहीं पता।\n\nमैं **चुंबक, प्रेरण, एडी करंट और लेज़ी ट्यूब प्रयोग** के बारे में मदद करता हूँ। कृपया अपना प्रश्न थोड़ा और स्पष्ट करें, या अपने शिक्षक से पूछें।`;
  return lang === 'hi' ? `${hi}\n\n---\n${en}` : en;
}

/* ───────── Online (server SSE) ───────── */
async function* streamServer(
  question: string,
  level: ConcreteLevel,
  lang: Lang,
  history: { role: 'user' | 'assistant'; text: string }[],
  signal: AbortSignal,
): AsyncGenerator<{ type: 'meta'; ids: string[] } | { type: 'delta'; text: string }> {
  const res = await fetch('/api/magneto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, level, lang, history, context: snapshot() }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`server ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const ev = /^event: (\w+)/m.exec(chunk)?.[1];
      const data = /^data: (.*)$/m.exec(chunk)?.[1];
      if (!ev || !data) continue;
      const parsed = JSON.parse(data);
      if (ev === 'meta') yield { type: 'meta', ids: parsed.ids as string[] };
      else if (ev === 'delta') yield { type: 'delta', text: parsed.text as string };
      else if (ev === 'error') throw new Error(parsed.message ?? 'stream error');
      else if (ev === 'done') return;
    }
  }
}

const byId = new Map(PASSAGES.map((p) => [p.id, p]));

/** Main entry point. Yields events for the UI to render progressively. */
export async function* ask(
  raw: string,
  opts: { level: Level; lang: Lang; history: ChatMessage[]; signal: AbortSignal },
): AsyncGenerator<EngineEvent> {
  const question = sanitize(raw);
  const level = detectLevel(question, opts.level);
  const lang = detectLang(question, opts.lang);
  track({ questions: 1 });

  // 1. Safety
  const safety = screen(question);
  if (safety.level === 'block') {
    track({ topic: `safety:${safety.category}` });
    const ids = ['safety'];
    yield { type: 'meta', sources: toSourceRefs(ids.map((i) => byId.get(i)!)), actions: ['model'], confidence: 'high', mode: 'safety', level };
    yield { type: 'delta', text: safety.message ?? '' };
    yield { type: 'done' };
    return;
  }
  const safePrefix = safety.level === 'warn' ? `${safety.message}\n\n` : '';
  const outgoing = redact(question);

  // 2. Retrieval + confidence gate
  const r = retrieve(outgoing);
  const insight = experimentInsight(outgoing);
  if (r.band === 'low' && !r.faq) {
    track({ lowConfidence: 1, failedRetrievals: 1, topic: 'low-confidence' });
    yield { type: 'meta', sources: [], actions: [], confidence: 'low', mode: 'low-confidence', level };
    yield { type: 'delta', text: safePrefix + lowConfidenceReply(r, lang) };
    yield { type: 'done' };
    return;
  }
  if (r.band !== 'high') track({ lowConfidence: 1 });
  track({ topic: r.faq?.faq.id ?? r.results[0]?.passage.id });
  const actions = actionsFrom(r, insight?.actions);
  const insightBlock = insight ? `\n\n${insight.text}` : '';

  // 3. Cached online answer?
  const ck = cacheKey(outgoing, level, lang);
  const isFollowUpContext = opts.history.length > 0 && /\b(it|that|this|more|again|why)\b/i.test(outgoing) && outgoing.split(' ').length < 6;
  const cached = !isFollowUpContext ? readCache()[ck] : undefined;

  // 4. Online path
  if (!cached && navigator.onLine) {
    try {
      const history = opts.history
        .filter((m) => !m.streaming && (m.role === 'user' || m.mode === 'online' || m.mode === 'offline'))
        .slice(-6)
        .map((m) => ({ role: m.role, text: redact(m.text).slice(0, 1200) }));
      let ids: string[] = [];
      let text = '';
      let started = false;
      for await (const ev of streamServer(outgoing, level, lang, history, opts.signal)) {
        if (ev.type === 'meta') {
          ids = ev.ids;
          yield {
            type: 'meta',
            sources: toSourceRefs(ids.map((i) => byId.get(i)).filter(Boolean) as Passage[]),
            actions,
            confidence: r.band === 'low' ? 'medium' : r.band,
            mode: 'online',
            level,
            followUp: r.faq?.faq.followUp,
          };
          if (safePrefix) yield { type: 'delta', text: safePrefix };
          started = true;
        } else {
          text += ev.text;
          yield { type: 'delta', text: ev.text };
        }
      }
      if (started && text.trim()) {
        if (insightBlock) yield { type: 'delta', text: insightBlock };
        writeCache(ck, { text, ids });
        yield { type: 'done' };
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        yield { type: 'done' };
        return;
      }
      // fall through to offline mode
    }
  }

  // 5. Cached / offline path
  const mode: ChatMessage['mode'] = cached ? 'cached' : 'offline';
  if (!cached) track({ offline: 1 });
  const out = cached ?? composeOffline(r, level, lang);
  const faqFollow = r.faq?.faq.followUp ?? ('followUp' in out ? (out as { followUp?: string }).followUp : undefined);
  yield {
    type: 'meta',
    sources: toSourceRefs(out.ids.map((i) => byId.get(i)).filter(Boolean) as Passage[]),
    actions,
    confidence: r.band === 'low' ? 'medium' : r.band,
    mode,
    level,
    followUp: faqFollow,
  };
  // Simulated streaming keeps the UI consistent (and feels responsive).
  const full = safePrefix + out.text + insightBlock;
  const words = full.split(/(\s+)/);
  for (let i = 0; i < words.length; i += 6) {
    if (opts.signal.aborted) break;
    yield { type: 'delta', text: words.slice(i, i + 6).join('') };
    await new Promise((res) => setTimeout(res, 12));
  }
  yield { type: 'done' };
}

export const QUICK_CHIPS = [
  'Why does copper slow it down?',
  'What is an eddy current?',
  'Explain Lenz’s law simply.',
  'How do I make my experiment fair?',
  'Show me the equation.',
  'Explain like I’m 10.',
  'Explain at college level.',
];

/** For "Explain like I'm 10" / "college level" chips: re-ask the last topic at another level. */
export function rephraseForLevel(chip: string, lastQuestion?: string) {
  if (!lastQuestion) return chip === 'Explain like I’m 10.' ? 'Explain like I’m 10: why does the magnet fall slowly through copper?' : 'Explain at college level: why does the magnet fall slowly through copper?';
  return `${chip.replace('.', ':')} ${lastQuestion}`;
}

export const FAQ_COUNT = FAQS.length;
