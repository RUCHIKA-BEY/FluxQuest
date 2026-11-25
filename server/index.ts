/**
 * FluxQuest server: serves the built site (dist/) and the Magneto API.
 *   POST /api/magneto  → Server-Sent Events: meta (passage ids), delta (text), done | error
 *   GET  /api/health   → { ok, llm }
 * Privacy: no logging of question text or IPs; rate-limit buckets live only in memory.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { retrieve } from '../src/chat/retrieval';
import { PASSAGES } from '../src/chat/knowledge/passages';
import { redact, sanitize, screen } from '../src/chat/safety';
import { SYSTEM_PROMPT, buildUserTurn } from './prompt';

// Load .env if present (Node ≥ 20.12). Never commit .env.
try {
  process.loadEnvFile?.();
} catch {
  /* no .env file */
}

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(here, '../dist');
const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.MAGNETO_MODEL ?? 'claude-opus-5-5';
const RATE = Number(process.env.MAGNETO_RATE_LIMIT ?? 12); // requests per minute per client
const MAX_BODY = 24 * 1024;
const HAS_KEY = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = HAS_KEY ? new Anthropic() : null;

/* ── Rate limiting (token bucket per client, in memory only) ── */
const buckets = new Map<string, { tokens: number; at: number }>();
function allow(key: string) {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: RATE, at: now };
  b.tokens = Math.min(RATE, b.tokens + ((now - b.at) / 60000) * RATE);
  b.at = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  if (buckets.size > 5000) buckets.clear();
  return true;
}
let inflight = 0;
const MAX_INFLIGHT = 8;

/* ── Aggregate, anonymous counters ── */
const stats = { requests: 0, lowConfidence: 0, safetyBlocks: 0, errors: 0, topics: {} as Record<string, number> };

/* ── Input validation ── */
const num = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined);
const MATS = new Set(['plastic', 'aluminium', 'copper', 'brass']);
function cleanParams(p: unknown) {
  const o = (p ?? {}) as Record<string, unknown>;
  return {
    material: MATS.has(o.material as string) ? o.material : undefined,
    wallMm: num(o.wallMm, 0.5, 4),
    innerDiameterMm: num(o.innerDiameterMm, 13, 30),
    magnetStrength: num(o.magnetStrength, 0.5, 1.5),
    dropHeightM: num(o.dropHeightM, 0.3, 1.5),
  };
}
function cleanContext(c: unknown) {
  const o = (c ?? {}) as Record<string, unknown>;
  const last = o.lastRun as Record<string, unknown> | undefined;
  const preds = (o.predictions ?? {}) as Record<string, unknown>;
  const dirs = new Set(['slower', 'faster', 'same']);
  return {
    currentSettings: cleanParams(o.params),
    lastRun: last
      ? { fallTimeS: num(last.fallTime, 0, 1000), avgSpeedMs: num(last.avgSpeed, 0, 100), terminalSpeedMs: num(last.terminalSpeed, 0, 100), settings: cleanParams(last.params) }
      : null,
    recentRuns: Array.isArray(o.recentRuns)
      ? o.recentRuns.slice(-8).map((r: Record<string, unknown>) => ({ run: num(r.n, 0, 1e6), ...cleanParams(r), fallTimeS: num(r.fallTime, 0, 1000) }))
      : [],
    predictions: {
      fastestTube: MATS.has(preds.fastest as string) ? preds.fastest : undefined,
      thickerWall: dirs.has(preds.thickness as string) ? preds.thickness : undefined,
      widerDiameter: dirs.has(preds.diameter as string) ? preds.diameter : undefined,
    },
    totalRuns: num(o.runCount, 0, 1e6),
  };
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function json(res: http.ServerResponse, code: number, body: unknown) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function handleMagneto(req: http.IncomingMessage, res: http.ServerResponse) {
  const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  if (!allow(ip)) return json(res, 429, { error: 'rate_limited', message: 'Too many questions at once. Please wait a moment.' });
  if (!client) return json(res, 503, { error: 'no_llm', message: 'LLM not configured; use offline mode.' });
  if (inflight >= MAX_INFLIGHT) return json(res, 503, { error: 'busy' });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return json(res, 400, { error: 'bad_request' });
  }
  const question = redact(sanitize(String(body.question ?? '')));
  if (!question) return json(res, 400, { error: 'empty' });
  const level = ['simple', 'detailed', 'expert'].includes(body.level as string) ? (body.level as string) : 'detailed';
  const lang = body.lang === 'hi' ? 'hi' : 'en';
  const history = (Array.isArray(body.history) ? body.history : [])
    .slice(-6)
    .map((m: Record<string, unknown>) => ({ role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const), content: redact(sanitize(String(m.text ?? ''), 1200)) }))
    .filter((m) => m.content);
  // The Messages API needs alternating turns starting with a user message.
  const turns: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const m of history) {
    if (!turns.length && m.role === 'assistant') continue;
    if (turns.length && turns[turns.length - 1].role === m.role) turns[turns.length - 1].content += '\n' + m.content;
    else turns.push({ ...m });
  }
  if (turns.length && turns[turns.length - 1].role === 'user') turns.pop();

  stats.requests++;
  const safety = screen(question);
  if (safety.level === 'block') {
    stats.safetyBlocks++;
    return json(res, 422, { error: 'safety' }); // client already handles safety locally
  }

  // Server-side retrieval is the source of truth for what the model may use.
  const r = retrieve(question, 6);
  if (r.band === 'low' && !r.faq) stats.lowConfidence++;
  const topic = r.faq?.faq.id ?? r.results[0]?.passage.id;
  if (topic) stats.topics[topic] = (stats.topics[topic] ?? 0) + 1;
  const faqIds = new Set(r.faq?.faq.sources ?? []);
  const passages = [...r.results.map((x) => x.passage)];
  // Make sure FAQ-linked passages are available too (deduplicated, max 7).
  for (const id of faqIds)
    if (!passages.some((p) => p.id === id)) {
      const p = PASSAGES.find((x) => x.id === id);
      if (p) passages.push(p);
    }
  const used = passages.slice(0, 7);

  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  send('meta', { ids: used.map((p) => p.id), confidence: r.band });

  inflight++;
  const ac = new AbortController();
  req.on('close', () => ac.abort());
  try {
    const stream = client.beta.messages.stream(
      {
        model: MODEL,
        max_tokens: 4096,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [...turns, { role: 'user', content: buildUserTurn({ question, level, lang, passages: used, context: cleanContext(body.context) }) }],
      },
      { signal: ac.signal },
    );
    for await (const ev of stream) {
      if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') send('delta', { text: ev.delta.text });
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') send('delta', { text: "\n\nI can't help with that one. Let's get back to magnets and eddy currents!" });
    send('done', {});
  } catch (e) {
    stats.errors++;
    if (!ac.signal.aborted) {
      const status = e instanceof Anthropic.APIError ? e.status : undefined;
      send('error', { message: status === 429 ? 'The AI service is busy.' : 'The AI service is unavailable.' });
    }
  } finally {
    inflight--;
    res.end();
  }
}

/* ── Static files (production) ── */
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};
function serveStatic(req: http.IncomingMessage, res: http.ServerResponse) {
  const urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  let file = path.normalize(path.join(DIST, urlPath));
  if (!file.startsWith(DIST)) return json(res, 403, { error: 'forbidden' });
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  if (!fs.existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Build the site first: npm run build');
  }
  const immutable = urlPath.startsWith('/assets/');
  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = req.url ?? '/';
  if (url.startsWith('/api/magneto') && req.method === 'POST') {
    handleMagneto(req, res).catch(() => {
      if (!res.headersSent) json(res, 500, { error: 'internal' });
      else res.end();
    });
    return;
  }
  if (url.startsWith('/api/health')) return json(res, 200, { ok: true, llm: !!client, model: client ? MODEL : null });
  if (url.startsWith('/api/stats')) return json(res, 200, stats);
  if (url.startsWith('/api/')) return json(res, 404, { error: 'not_found' });
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`FluxQuest server on http://localhost:${PORT} · Magneto LLM: ${client ? MODEL : 'OFF (offline FAQ mode)'}`);
});
