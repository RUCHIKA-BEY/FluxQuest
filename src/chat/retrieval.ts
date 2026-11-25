/**
 * Hybrid retrieval for Magneto: BM25 (keyword) + dense vectors (cosine), fused with Reciprocal Rank Fusion.
 * Runs in the browser (offline) AND on the server (source of truth for the LLM prompt). No DOM APIs here.
 *
 * Vector search uses a local "hashed n-gram embedding" so it works offline with zero downloads.
 * It's swappable: implement `Embedder` with a hosted embedding model to upgrade semantic recall.
 */
import { PASSAGES, type Passage } from './knowledge/passages';
import { FAQS, type FAQ } from './knowledge/faq';

const STOP = new Set(
  'a an the is are was were be been being of to in on at for and or but if then so do does did doing it its this that these those i you he she we they me my your our their what which who whom how why when where can could would should will shall may might must with without from by as about into than too very just also not no yes please tell explain show give some any more most much many there here up down out over under again ok okay hi hello'.split(
    ' ',
  ).concat('में की का के है हैं था थी से को और क्या कैसे यह वह ये वो एक पर भी तो ही नहीं बहुत मुझे मैं हम आप इस उस कोई कुछ होता होती होते जाता जाती करता करती बताओ बताइए समझाओ'.split(' ')),
);

/** Synonyms and Hindi keyword bridges (expand the query, not the documents). */
const SYNONYMS: Record<string, string[]> = {
  slow: ['brake', 'braking', 'drag', 'damping'],
  slowly: ['slow', 'brake', 'braking'],
  slower: ['slow', 'brake', 'braking'],
  slows: ['slow', 'brake', 'braking'],
  brakes: ['brake', 'braking'],
  fast: ['speed', 'free', 'fall'],
  faster: ['speed', 'free', 'fall'],
  speed: ['velocity', 'terminal'],
  velocity: ['speed'],
  thick: ['thickness', 'wall'],
  thicker: ['thickness', 'wall'],
  thin: ['thickness', 'wall'],
  wide: ['diameter', 'radius', 'bore'],
  wider: ['diameter', 'radius', 'bore'],
  width: ['diameter', 'radius'],
  diameter: ['radius', 'bore'],
  eddies: ['eddy'],
  whirlpool: ['eddy', 'swirl'],
  voltage: ['emf'],
  current: ['eddy', 'induced'],
  currents: ['eddy', 'induced', 'current'],
  electricity: ['current', 'induction'],
  heat: ['energy', 'joule'],
  hot: ['heat', 'temperature'],
  warm: ['heat', 'temperature'],
  equation: ['formula', 'derivation'],
  maths: ['formula', 'derivation', 'mathematical'],
  math: ['formula', 'derivation', 'mathematical'],
  fair: ['fair', 'control', 'variable'],
  accurate: ['limitations', 'accuracy'],
  wrong: ['limitations'],
  real: ['physical', 'model'],
  aluminum: ['aluminium'],
  // Hindi → English bridges
  चुंबक: ['magnet'],
  चुम्बक: ['magnet'],
  तांबा: ['copper'],
  तांबे: ['copper'],
  ताँबा: ['copper'],
  एल्युमिनियम: ['aluminium'],
  पीतल: ['brass'],
  प्लास्टिक: ['plastic'],
  धीरे: ['slow', 'brake'],
  धीमा: ['slow', 'brake'],
  धारा: ['current', 'eddy'],
  धाराएँ: ['current', 'eddy'],
  भंवर: ['eddy'],
  एडी: ['eddy'],
  गर्मी: ['heat', 'energy'],
  ऊर्जा: ['energy'],
  नियम: ['law'],
  लेंज: ['lenz'],
  लेंज़: ['lenz'],
  फैराडे: ['faraday'],
  मोटाई: ['thickness', 'wall'],
  मोटी: ['thickness', 'wall'],
  व्यास: ['diameter'],
  चौड़ी: ['diameter', 'wide'],
  फ्लक्स: ['flux'],
  प्रेरण: ['induction'],
  सुरक्षा: ['safety'],
  निष्पक्ष: ['fair'],
  प्रयोग: ['experiment'],
  गति: ['speed', 'velocity'],
  क्यों: ['why'],
  गिरता: ['fall'],
  गिरना: ['fall'],
  गिरती: ['fall'],
  नली: ['tube'],
  चालक: ['conductor'],
};

/** Very light stemmer: enough to match plurals and -ing/-ed forms. */
function stem(w: string) {
  if (/[ऀ-ॿ]/.test(w)) return w;
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) return w.slice(0, -1);
  return w;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9ऀ-ॿ]+/)
    .filter((w) => w && !STOP.has(w) && w.length > 1)
    .map(stem);
}

export function expandQuery(tokens: string[]): string[] {
  const out = [...tokens];
  for (const t of tokens) for (const s of SYNONYMS[t] ?? []) out.push(stem(s));
  return out;
}

/* ───────────── BM25 ───────────── */
interface Doc {
  id: string;
  tokens: string[];
  tf: Map<string, number>;
  len: number;
}

class BM25 {
  private docs: Doc[];
  private df = new Map<string, number>();
  private avgLen: number;
  constructor(
    items: { id: string; text: string }[],
    private k1 = 1.2,
    private b = 0.75,
  ) {
    this.docs = items.map(({ id, text }) => {
      const tokens = tokenize(text);
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      return { id, tokens, tf, len: tokens.length };
    });
    for (const d of this.docs) for (const t of d.tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    this.avgLen = this.docs.reduce((a, d) => a + d.len, 0) / Math.max(1, this.docs.length);
  }
  idf(t: string) {
    const n = this.df.get(t) ?? 0;
    return Math.log(1 + (this.docs.length - n + 0.5) / (n + 0.5));
  }
  search(q: string[]) {
    const uniq = [...new Set(q)];
    return this.docs
      .map((d) => {
        let s = 0;
        for (const t of uniq) {
          const f = d.tf.get(t);
          if (!f) continue;
          s += (this.idf(t) * (f * (this.k1 + 1))) / (f + this.k1 * (1 - this.b + (this.b * d.len) / this.avgLen));
        }
        return { id: d.id, score: s };
      })
      .sort((a, b) => b.score - a.score);
  }
  hasTerm(t: string) {
    return this.df.has(t);
  }
}

/* ───────────── Vector embeddings (hashed n-grams) ───────────── */
export interface Embedder {
  embed(text: string): Float32Array;
}

const DIM = 1024;
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Word unigrams + bigrams + character trigrams hashed into a fixed vector, L2-normalised. Handles typos and word forms. */
export const hashedEmbedder: Embedder = {
  embed(text: string) {
    const v = new Float32Array(DIM);
    const toks = tokenize(text);
    const add = (f: string, w: number) => {
      const h = hash(f);
      v[h % DIM] += (h & 0x80000000 ? -1 : 1) * w;
    };
    toks.forEach((t, i) => {
      add('w:' + t, 1.6);
      if (i > 0) add('b:' + toks[i - 1] + '_' + t, 0.8);
      const p = `#${t}#`;
      for (let j = 0; j < p.length - 2; j++) add('c:' + p.slice(j, j + 3), 0.35);
    });
    let n = 0;
    for (let i = 0; i < DIM; i++) n += v[i] * v[i];
    n = Math.sqrt(n) || 1;
    for (let i = 0; i < DIM; i++) v[i] /= n;
    return v;
  },
};

const cosine = (a: Float32Array, b: Float32Array) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

/* ───────────── Indexes ───────────── */
const passageText = (p: Passage) => `${p.title}. ${p.title}. ${p.text} ${p.tags.join(' ')} ${p.tags.join(' ')}`;
const faqText = (f: FAQ) => `${f.questions.join(' . ')} ${f.questions[0]}`;

let built: {
  bm: BM25;
  vec: Map<string, Float32Array>;
  faqBm: BM25;
  faqVec: Map<string, Float32Array>;
  embedder: Embedder;
} | null = null;

function index(embedder: Embedder = hashedEmbedder) {
  if (built && built.embedder === embedder) return built;
  built = {
    embedder,
    bm: new BM25(PASSAGES.map((p) => ({ id: p.id, text: passageText(p) }))),
    vec: new Map(PASSAGES.map((p) => [p.id, embedder.embed(passageText(p))])),
    faqBm: new BM25(FAQS.map((f) => ({ id: f.id, text: faqText(f) }))),
    faqVec: new Map(FAQS.map((f) => [f.id, embedder.embed(faqText(f))])),
  };
  return built;
}

export interface Retrieved {
  passage: Passage;
  score: number; // fused RRF score
  bm25: number;
  cosine: number;
}

export interface RetrievalResult {
  query: string;
  results: Retrieved[];
  faq: { faq: FAQ; score: number } | null;
  /** 0–1 */
  confidence: number;
  band: 'high' | 'medium' | 'low';
  /** Query content words that appear nowhere in the knowledge base. */
  unknownTerms: string[];
}

const RRF_K = 60;

export function retrieve(query: string, k = 5, embedder: Embedder = hashedEmbedder): RetrievalResult {
  const ix = index(embedder);
  const base = tokenize(query);
  const q = expandQuery(base);
  const qv = embedder.embed(q.join(' '));

  const bm = ix.bm.search(q);
  const vec = PASSAGES.map((p) => ({ id: p.id, score: cosine(qv, ix.vec.get(p.id)!) })).sort((a, b) => b.score - a.score);
  const fused = new Map<string, { rrf: number; bm: number; cos: number }>();
  bm.forEach((r, i) => fused.set(r.id, { rrf: r.score > 0 ? 1 / (RRF_K + i) : 0, bm: r.score, cos: 0 }));
  vec.forEach((r, i) => {
    const f = fused.get(r.id)!;
    f.rrf += 1 / (RRF_K + i);
    f.cos = r.score;
  });
  const byId = new Map(PASSAGES.map((p) => [p.id, p]));
  const results = [...fused.entries()]
    .map(([id, f]) => ({ passage: byId.get(id)!, score: f.rrf, bm25: f.bm, cosine: f.cos }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  // FAQ matching
  const fb = ix.faqBm.search(q);
  const fbMax = fb[0]?.score || 1;
  const faqScored = FAQS.map((f) => {
    const b = fb.find((x) => x.id === f.id)?.score ?? 0;
    const c = cosine(qv, ix.faqVec.get(f.id)!);
    return { faq: f, score: 0.55 * (b / Math.max(fbMax, 4)) + 0.45 * c };
  }).sort((a, b) => b.score - a.score);

  // Confidence: keyword strength, semantic similarity, and how much of the query the KB knows about.
  const unknownTerms = base.filter((t) => !ix.bm.hasTerm(t) && !(SYNONYMS[t] ?? []).some((s) => ix.bm.hasTerm(stem(s))));
  const coverage = base.length ? 1 - unknownTerms.length / base.length : 0;
  const topBm = results[0]?.bm25 ?? 0;
  const topCos = Math.max(0, results[0]?.cosine ?? 0);
  const confidence = Math.max(0, Math.min(1, 0.4 * Math.min(1, topBm / 9) + 0.3 * Math.min(1, topCos / 0.45) + 0.3 * coverage));
  const band = coverage < 0.5 ? 'low' : confidence >= 0.55 ? 'high' : confidence >= 0.38 ? 'medium' : 'low';
  const faq = faqScored[0] && faqScored[0].score >= 0.42 ? faqScored[0] : null;

  return { query, results, faq, confidence, band, unknownTerms };
}
