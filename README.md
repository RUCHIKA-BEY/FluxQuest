# FluxQuest: The Slow-Motion Magnet

**Seeing the Invisible Force.** An interactive, accessible virtual lab that helps students (ages 10–16) discover why a magnet falls slowly through a copper tube but quickly through a plastic one: through prediction, fair experiments, X-ray visualisation and evidence.

It addresses problem statements **P021** (fair fall-time comparison), **P022** (making hidden motion and invisible physics understandable) and **P023** (one-factor-at-a-time tests of material, wall thickness and internal diameter).

> FluxQuest supports the physical Agastya Lazy Tube model. It does not replace hands-on exploration.

## Quick start

```bash
npm install
npm run dev          # web on http://localhost:5173 + Magneto API on :8787 (proxied)
```

Production:

```bash
npm run build
npm start            # serves dist/ and /api on http://localhost:8787
```

### Turning on Magneto's AI answers (optional)

Without a key, Magneto runs in **offline mode**, using 20 reviewed FAQ answers (Simple/Detailed/Expert, plus Hindi) and passages from the curated knowledge base. To enable grounded AI answers via the Claude API:

```bash
cp .env.example .env   # then set ANTHROPIC_API_KEY=...
```

The default model is `claude-opus-5-5`. Override it with `MAGNETO_MODEL`. Rate limiting is controlled by `MAGNETO_RATE_LIMIT` (requests per minute per client).

## What's inside

| Area | Where |
|---|---|
| Design, physics, 3D and accessibility specs, plus the roadmap | [`docs/PLAN.md`](docs/PLAN.md) |
| Physics engine (pure TS, tested) | `src/lib/physics.ts` |
| 3D lab (React Three Fiber, lazy-loaded) | `src/components/lab/LabScene.tsx` |
| 2D fallback / reduced-motion diagram | `src/components/lab/TubeDiagram2D.tsx` |
| Pages | `src/sections/*` |
| Magneto (RAG tutor) | `src/chat/*`, `server/*` |

### Magneto architecture

1. **Sanitise and safety screen.** This blocks mains electricity, weapons, heating and swallowing magnets, warns on medical devices and cryogenics, and redacts emails and phone numbers.
2. **Level and language detection:** Simple, Detailed or Expert, and Hindi (Devanagari input or the toggle).
3. **Hybrid retrieval** (`src/chat/retrieval.ts`): BM25 plus a local hashed n-gram vector embedding, fused by reciprocal rank fusion. A confidence score combines keyword strength, similarity and query coverage. Low confidence produces *"I'm not confident enough to answer this from the verified project materials."* plus a clarifying question.
4. **Online:** the server re-runs retrieval (it is the source of truth), sends numbered passages and a validated experiment snapshot to Claude with strict grounding rules, and streams back over SSE with `[S1]`-style citations. The client drops any citation number that isn't in the list.
5. **Offline / API failure:** reviewed FAQ answers, or an answer composed from the passages. Online answers are also cached locally for offline replay.
6. **Experiment insight** (`src/chat/insight.ts`) explains the student's *own* runs, for example "copper averaged 2.75 s vs aluminium 1.76 s…", and suggests a controlled next test. Action buttons deep-link to the Variable Lab, X-Ray mode or the Real Model Guide.

Every source passage carries a label (*Established physics*, *Project assumption* or *Estimate*) and a real reference: OpenStax *University Physics Vol. 2* ch. 13, OpenStax *College Physics 2e* ch. 23, Levin et al. *Am. J. Phys.* 74, 815 (2006), MacLatchy et al. *Am. J. Phys.* 61, 1096 (1993), or the FluxQuest project notes.

**The Agastya Lazy Tube manual is not yet ingested.** To add it, put its sections into `src/chat/knowledge/passages.ts` with `sourceId: 'agastya-manual'` and set `ingested: true` in `sources.ts`. Then run `npm test`.

## Tests

```bash
npm test          # physics qualitative guarantees + retrieval quality (22 questions incl. Hindi and off-topic)
npm run typecheck
```

## Accessibility and performance

- Full keyboard support. In the lab: Space runs or pauses, R resets the view, X toggles X-ray, and 1–4 switch cameras.
- Visible focus and a skip link. Results are announced through an `aria-live` region, and graphs have table views.
- Reduced motion (OS setting or in-app), high-contrast mode, text scaling, and Low Graphics Mode, which is switched on automatically for low-end devices.
- If WebGL is missing or the GPU context is lost, the lab falls back to a fully working 2D diagram.
- Three.js and charts are code-split. The hero's 3D preview loads only when the browser is idle. A service worker caches the app for offline classroom use.

## Honest science

The simulation is an **educational approximation**. It uses the Levin et al. point-dipole braking result, extended to thick walls, with a calibrated finite-size factor η = 0.16. That factor is a project assumption, not a measured constant. The trends are physically grounded; exact times will differ from real tubes. Calibrate η against real Lazy Tube measurements.
