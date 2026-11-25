# FluxQuest — The Slow-Motion Magnet: Seeing the Invisible Force

Design and engineering plan. It covers problem statements **P021** (fair fall-time comparison),
**P022** (making hidden motion and invisible physics understandable) and **P023** (one-factor-at-a-time tests
of material, wall thickness and internal diameter).

---

## 1. Sitemap

FluxQuest is a single-page app with hash routes. Deep links let Magneto open any view in a specific state.

| Route | View | Purpose | Problem statement |
|---|---|---|---|
| `#/` | **Home / Hero** | Mystery hook, animated 3D preview, 30-second intro, CTAs | — |
| `#/predict` | **Predict Before You See** | 4 predictions (fastest tube, why, thickness, diameter) stored locally | P021, P023 |
| `#/lab` | **3D Virtual Lab** | Full simulator: controls, 3D scene or 2D fallback, live graphs, replay, compare two runs | P021, P022 |
| `#/lab?xray=1` | **X-Ray Mode** (Lab state) | Eddy loops, current arrows, field lines, opposing force, slow-motion, inspect-on-pause | P022 |
| `#/variables?var=thickness` | **Variable Lab** | One-variable-at-a-time experiments with locked controls, prediction, table, auto graph, reflection | P023 |
| `#/results` | **Results & Evidence** | History, charts, best/worst, prediction accuracy, patterns, CSV copy/download, reset | P021, P023 |
| `#/learn` | **Learn the Physics** | Simple → Intermediate → Advanced explanations with animated diagrams and applications | P022 |
| `#/model` | **Real Agastya Model Companion** | Procedure, fair-test checklist, printable table, safety, model improvements, facilitator guide | P021–P023 |
| (global) | **Ask Magneto** | Floating button; slide-in panel on desktop, full-screen sheet on mobile | all |
| (global) | **Settings** | Reduced motion, high contrast, low graphics, Advanced Physics, text size | — |

---

## 2. Component and file structure

```
FluxQuest/
├─ index.html                     # Shell, meta, no-JS message
├─ package.json / vite.config.ts / tsconfig*.json
├─ public/
│  ├─ favicon.svg
│  ├─ manifest.webmanifest        # Installable PWA
│  └─ sw.js                       # Offline cache (app shell + hashed assets)
├─ server/
│  ├─ index.ts                    # Node server: static dist + /api/magneto (SSE), rate limit, sanitising
│  └─ prompt.ts                   # Strict Magneto system prompt + context builder
├─ docs/PLAN.md                   # This document
└─ src/
   ├─ main.tsx / App.tsx / index.css     # Tailwind v4 @theme design tokens
   ├─ lib/
   │  ├─ physics.ts               # Simulation model (pure, testable, shared by 2D/3D/charts/Magneto)
   │  ├─ materials.ts             # Tube materials, conductivity, display colours
   │  ├─ random.ts                # Seeded RNG for repeatable trial variation
   │  ├─ router.ts                # Tiny hash router with query params
   │  ├─ webgl.ts                 # WebGL capability detection
   │  ├─ csv.ts / format.ts       # Export & number formatting
   │  └─ patterns.ts              # Automatic "what pattern do your results show?" explanations
   ├─ store/
   │  ├─ settings.ts              # a11y/graphics prefs (persisted)
   │  ├─ lab.ts                   # params, runs, predictions, playback (persisted)
   │  └─ announcer.ts             # aria-live queue
   ├─ hooks/
   │  ├─ usePlayback.ts           # rAF playback clock with speed, pause, scrub
   │  └─ useMotionPref.ts         # merges OS prefers-reduced-motion with app toggle
   ├─ components/
   │  ├─ layout/ Header, Footer, SkipLink, SettingsPanel, PageTransition, Announcer
   │  ├─ ui/ Button, Card, Slider, Toggle, Segmented, Badge, AnimatedNumber, Confetti, Particles, Icon
   │  ├─ lab/
   │  │  ├─ LabScene.tsx          # R3F scene (lazy chunk)
   │  │  ├─ scene/ Tube, Magnet, FieldLines, EddyRings, ForceArrows, HeatGlow, Environment
   │  │  ├─ TubeDiagram2D.tsx     # SVG cross-section: fallback + reduced motion + compare view
   │  │  ├─ LabControls.tsx       # Variables, toggles, camera presets
   │  │  ├─ PlaybackBar.tsx       # Run/replay/pause/speed/scrub
   │  │  ├─ LiveGraphs.tsx        # v–t and y–t graphs with playhead
   │  │  ├─ EnergyBar.tsx         # PE → KE + heat
   │  │  ├─ XRayInspector.tsx     # Pause-and-inspect questions
   │  │  ├─ ResultCard.tsx        # Dramatic reveal + prediction check
   │  │  └─ CompareRuns.tsx       # Side-by-side twin tubes + overlaid graph
   ├─ sections/ Hero, IntroMovie, Predict, Lab, VariableLab, Results, Learn, RealModel
   │  └─ learn/ diagrams (FluxDiagram, EddyDiagram, LenzDiagram, EnergyDiagram, AppIcons)
   └─ chat/
      ├─ Magneto.tsx              # Launcher + panel/sheet
      ├─ MessageView.tsx          # Safe mini-markdown renderer, sources, actions
      ├─ Mascot.tsx               # Robot-magnet mascot SVG
      ├─ knowledge/               # Curated KB: passages with source metadata & evidence type
      │  ├─ sources.ts            # Source registry (title, org/author, URL/file, section)
      │  ├─ passages.ts           # Retrieval passages (EN, some HI)
      │  ├─ faq.ts                # Reviewed answers at Simple/Detailed/Expert (+ Hindi Simple)
      │  └─ glossary.ts
      ├─ retrieval.ts             # BM25 + vector (hashed n-gram embedding) hybrid, RRF fusion, confidence
      ├─ engine.ts                # Orchestrator: safety → level detect → retrieve → LLM stream | offline compose
      ├─ experimentContext.ts     # Snapshot of the student's live params/runs/predictions
      ├─ insight.ts               # Explains the student's own results (e.g. copper vs aluminium)
      ├─ safety.ts                # Unsafe-topic detection and safe replies
      ├─ speech.ts                # Voice input (SpeechRecognition) + TTS
      ├─ analytics.ts             # Local-only, anonymous counters
      └─ store.ts                 # Chat history (persisted), level, language, voice
```

---

## 3. Visual design system: "Espresso Lab"

### Colour tokens (dark default)

| Token | Hex | Use | Contrast on `espresso-950` |
|---|---|---|---|
| `espresso-950` | `#16100D` | Page background | — |
| `espresso-900` | `#1F1712` | Section background | — |
| `espresso-800` | `#2B201A` | Cards | — |
| `espresso-700` | `#3A2C23` | Borders, inputs | — |
| `oat-50` | `#F6F0E4` | Primary text | 16.9 : 1 |
| `oat-200` | `#E3D7C1` | Secondary text | 12.9 : 1 |
| `oat-400` | `#BFAE93` | Muted text (≥14px) | 8.4 : 1 |
| `sage-300` | `#B5CDA8` | Brand accent, links, focus | 10.9 : 1 |
| `sage-400` | `#9DBB8C` | Primary buttons (espresso text on top) | 8.6 : 1 |
| `field` (eucalyptus) | `#86CFC3` | **Magnetic field** lines | 10.6 : 1 |
| `current` (caramel) | `#F0B062` | **Induced eddy current** | 10.0 : 1 |
| `success` (fresh sage) | `#A6E3A1` | Correct predictions (+ ✓ icon) | 12.9 : 1 |
| `warn` (terracotta) | `#F08A6C` | Warnings / incorrect (+ ✕ icon) | 7.3 : 1 |
| `heat` (ember) | `#E86A4A` | Heat glow (decorative, always labelled) | — |

**High-contrast mode** switches to pure `#000` / `#FFF` / `#FFE14D` with 2px borders, removes translucency, and
thickens chart strokes. **No colour-only meaning:** field lines carry arrowheads, current carries ⊙/⊗ symbols and
dashed animation, correct/incorrect results always include an icon and a word.

### Typography
- Display: **"Fraunces"**-style serif fallback stack → we ship system stacks only (offline-first):
  `ui-serif, Georgia, "Times New Roman"` for headings; `system-ui, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Devanagari"` for body.
- Scale (rem): 0.875 / 1 / 1.125 / 1.25 / 1.5 / 2 / 2.75 / clamp(2.5rem, 7vw, 4.5rem) for the hero.
- Body line-height 1.6, max line length ~68ch. Numbers use `tabular-nums`.

### Spacing, radius and elevation
- 4px base grid: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Radius: 10px controls, 18px cards, 999px chips.
- Elevation: inner highlight `inset 0 1px 0 rgb(255 255 255 / .04)` + soft shadow; glow only on interactive focus/active.

### Components
- **Buttons:** primary (sage fill, espresso text), secondary (outline oat), ghost, danger (terracotta outline).
  Minimum 44×44px, 3px sage focus ring with 2px offset, press scale .97, hover lift 1px.
- **Cards:** espresso-800, 1px espresso-700 border, 18px radius, optional header icon and eyebrow label.
- **Sliders:** native `<input type=range>` (keyboard and screen-reader friendly), styled track and thumb, live value badge, unit.
- **Toggles:** `role="switch"` buttons with on/off text.
- **Segmented control:** radio-group semantics with arrow-key navigation.
- **Icons:** inline SVG, 24px grid, 1.75px stroke, always paired with text or `aria-label`.

### Animation rules
1. Animation explains (falling, inducing, opposing) or gives feedback (press, success). Decoration stays subtle.
2. Durations: micro 120–180ms, UI 220–320ms, page 350ms, reveal 600–900ms. Easing `cubic-bezier(.2,.8,.2,1)`.
3. Nothing flashes more than 3 times per second. Confetti has no strobing and runs only once.
4. **Reduced motion** (OS setting or app toggle): no particles, parallax, auto-rotation, hero loop or confetti. Page
   transitions become fades. Science animations play only when the user starts them and default to 0.25× speed,
   and a static 2D diagram is always available.

---

## 4. 3D scene specification

- **Renderer:** React Three Fiber in a lazy-loaded chunk. `dpr={[1, 1.75]}` (1 in Low Graphics),
  `antialias` off in Low Graphics, no post-processing, a single directional shadow (off in Low Graphics).
- **Units:** 1 scene unit = 1 m vertically. The tube radius is drawn **4× larger** than real for visibility; the UI says so.
- **Objects**
  - *Table*: low-poly box with wood-tone `MeshStandardMaterial`, with a stand clamp holding the tube.
  - *Tube*: open-ended `CylinderGeometry` (outer, 40 segments) plus an inner wall and two annular rims (`RingGeometry`) so
    wall thickness is visible. Material colour, metalness and roughness come from the selected material. Opacity is
    0.35 normally and 0.12 in X-ray, with depthWrite off for the transparent pass.
  - *Magnet*: cylinder split into N (sage-tinted) and S (oat) halves with "N"/"S" canvas-texture labels, so poles
    don't rely on colour alone.
  - *Release mechanism*: pin-and-gate at the top. The gate swings open on Run so every start is the same (P021).
  - *Catch tray*: shallow foam-lined box under the tube.
  - *Measurement marks*: ticks every 10 cm with start and finish "sensor gates" (P021 repeatable timing).
- **Physics visuals** (they follow the magnet and are driven by the same trajectory sample as the graphs)
  - *Field lines*: 8 dipole field loops (4 in Low Graphics) traced from the analytic dipole field, drawn in eucalyptus with
    arrowheads.
  - *Eddy rings*: two torus rings at the tube wall, ~1 magnet length above and below the magnet, with opposite circulation. The
    emissive intensity follows induced current ∝ σ·v·B-gradient. Small cone "charges" orbit to show direction.
  - *Induced field*: short arrows on the ring axes showing the induced dipoles. The one below repels and the one above attracts,
    and both oppose the motion.
  - *Force arrows*: gravity (down, oat) and braking (up, caramel), with lengths proportional to force and a text label in HTML overlay.
  - *Heat*: a translucent ember band on the tube wall around the magnet, with opacity ∝ dissipated power k·v².
- **Cameras** (drei `OrbitControls`, damping, limits)
  - *Side*: frames the whole tube. *Top*: looks down the bore. *Close-up*: follows the magnet.
    *X-ray*: close-up plus X-ray materials. Reset view is a button and the `R` key.
- **Fallbacks:** if WebGL is missing, or the context is lost or fails to create, an error boundary swaps in `TubeDiagram2D`.
  The 2D diagram is fully functional (same playback, overlays and inspection), so the page never depends on 3D.

---

## 5. Physics model specification

**Model (educational approximation):** a magnetic dipole falls along the axis of a conducting tube.

- Equation of motion: `m·dv/dt = m·g − k(z)·v − c_air·v²`.
- Braking coefficient (thick-wall extension of the point-dipole result of Levin, da Silveira & Rizzato, *Am. J. Phys.* 74, 815 (2006)):

  `k = η · (45 μ0² μ² σ / 1024) · ∫ (1/r⁴) dr`, integrated across the wall from a_in to a_out
  `  = η · (45 μ0² μ² σ / 1024) · (a_in⁻³ − a_out⁻³)/3`

  For a thin wall this reduces to the published `45 μ0² μ² σ w / (1024 a⁴)`.
  - σ: conductivity (copper 5.96×10⁷, aluminium 3.5×10⁷ (alloy), brass 1.6×10⁷, plastic ≈ 0 S/m).
  - μ: magnet dipole moment (default 1.29 A·m², a 12 mm × 12 mm NdFeB cylinder of about 10 g). The strength slider scales μ (×0.5 to ×1.5).
  - η ≈ 0.16: a **finite-size correction** (a real magnet isn't a point dipole and nearly fills the bore). We chose it so a standard
    copper tube gives a terminal speed of tens of cm/s, which matches typical classroom observations. This value is a **project
    assumption**, not established physics, and the UI says so.
- **End effects:** braking ramps from about 50% at the tube mouth to 100% about two radii inside (`k(z)` smoothstep), so the entry
  and exit transients look believable.
- **Integration:** semi-implicit Euler at Δt = 1 ms, sampled every 10 ms for playback and graphs. Outputs are time, position,
  velocity, acceleration, braking force, power, cumulative heat, KE and PE, plus the summary values (fall time, terminal speed,
  average speed, braking strength index, % energy turned into heat).
- **Trial variation** (repeatable via a seeded RNG): ±2.5% on k (magnet tilt and wobble) and ±1.5% on air drag. Each run stores
  its seed, so a replay is identical.
- **Qualitative checks the model guarantees:** plastic ≈ free fall (√(2h/g)); Cu > Al > brass > plastic for braking;
  thicker wall → more braking with diminishing returns; wider bore → much less braking (∝ a⁻⁴ for thin walls);
  stronger magnet → more braking (∝ μ², while mass stays fixed); terminal speed `v_t = mg/k` is reached within a few τ = m/k.
- **Validity guards:** the inner diameter must exceed the magnet diameter (12 mm), and the bore range is 13 to 30 mm.
- **Not modelled:** magnet tumbling, wall contact friction, self-inductance (skin effects at high speed), and non-axial fields near
  the ends beyond the ramp. These are listed on the Limitations card and given to Magneto.

---

## 6. Accessibility checklist (WCAG 2.2 AA)

- [x] Semantic landmarks (`header`, `nav`, `main`, `footer`), a single `h1` per view, ordered headings, and a skip link.
- [x] Every action is reachable by keyboard, with logical tab order, visible 3px focus rings, and no keyboard traps (the chat panel
      traps focus only while it is open as a modal sheet, and `Esc` closes it).
- [x] Lab shortcuts: `Space` run/pause, `R` reset view, `X` X-ray, `1–4` camera presets. They are listed in the UI and turned off while typing.
- [x] Native form controls with `<label>`s. Sliders announce value and unit via `aria-valuetext`.
- [x] The 3D canvas has `role="img"` and a live text description. A text summary sits alongside every graph (`figure` + `figcaption`
      and a data table toggle).
- [x] `aria-live="polite"` announcer for run start, run finish (fall time), prediction outcome, and chat answers.
- [x] Contrast: all text ≥ 4.5:1 and UI components ≥ 3:1 (tokens above). High-contrast mode is available.
- [x] Colour is never the only signal: icons, words, patterns (dashed current) and N/S labels carry meaning too.
- [x] Touch targets ≥ 44×44px, with spacing ≥ 8px.
- [x] `prefers-reduced-motion` is respected, plus an in-app toggle (rules in §3). Nothing flashes more than 3 times per second.
- [x] Text alternatives: the intro movie has captions and a transcript, and every diagram has `<title>`/`<desc>`.
- [x] Low Graphics Mode and a 2D fallback. Content stays readable if 3D fails.
- [x] Language: `lang` attributes on Hindi text (`lang="hi"`), and Devanagari font fallback.
- [x] Magneto: labelled controls, `role="log"` message list, keyboard send, voice is optional, and every TTS-spoken answer is also on screen.

---

## 7. Magneto: research tutor architecture

```
question ─► sanitise ─► safety screen ─► level detect (Simple/Detailed/Expert)
         ─► hybrid retrieval (BM25 + hashed n-gram vector, RRF) over curated KB
         ─► confidence = f(top score, agreement between rankers, query coverage)
              ├─ low  ─► "I'm not confident…" + clarifying question + research direction
              └─ ok   ─► [online] POST /api/magneto (SSE stream): server re-retrieves (server is source of truth),
                         builds a strict system prompt with the passages and the student's experiment snapshot,
                         streams from the Claude API, and returns cited passage IDs
                         [offline/API error] reviewed FAQ answer at the requested level, or composed from passages
         ─► + experiment insight (student's own runs), + action buttons (Variable Lab / X-Ray / Real Model Guide)
```

- **Evidence labels** on every source: *Established physics*, *Project assumption*, *Estimate*.
- **Sources** are real and verifiable: OpenStax *University Physics Vol. 2* (ch. 13), OpenStax *College Physics 2e* (ch. 23),
  Levin et al. 2006 (*Am. J. Phys.*), MacLatchy et al. 1993 (*Am. J. Phys.*), the FluxQuest problem statements, and
  FluxQuest project notes. **The Agastya Lazy Tube manual isn't bundled** because we don't have its text. A clearly marked
  ingestion slot (`knowledge/sources.ts` → `agastya-manual`) explains how to add it. Nothing is invented on its behalf.
- **Vector search:** the offline build uses a local hashed character-trigram + word embedding (no network). The `Embedder` interface lets
  you swap in a hosted embedding model later without changing the retrieval code.
- **Privacy:** no accounts and no personal data. History stays in localStorage, analytics are anonymous local counters, and the server
  keeps only in-memory rate-limit buckets.

---

## 8. Development roadmap

| Phase | Scope | Status |
|---|---|---|
| 0 | Plan, design system, physics spec (this doc) | ✅ |
| 1 | Scaffold: Vite + React + TS + Tailwind v4, routing, settings, layout, a11y foundation | ✅ |
| 2 | Physics engine + playback + 2D diagram (works without WebGL) | ✅ |
| 3 | 3D lab (R3F), camera presets, X-ray visuals, live graphs, energy bar, compare runs | ✅ |
| 4 | Predict, Variable Lab, Results dashboard, CSV export | ✅ |
| 5 | Learn the Physics, Real Model Companion (print table) | ✅ |
| 6 | Magneto: KB, hybrid retrieval, offline FAQ, server SSE + Claude API, voice, Hindi | ✅ |
| 7 | PWA offline cache, performance pass, a11y audit | ✅ first pass |
| Next | Ingest the official Agastya Lazy Tube manual; classroom pilot; calibrate η against real timings from the physical model; hosted embeddings; teacher dashboard; full Hindi UI | ⏭ |
