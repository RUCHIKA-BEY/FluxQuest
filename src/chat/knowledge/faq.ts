import type { ActionId } from './passages';

/**
 * Reviewed answers to the most common questions. These are the offline / API-failure answers.
 * Text uses a tiny markdown subset: **bold**, "- " bullets, "### " headings, `code`.
 * `sources` are passage ids (the citations shown under the answer).
 */
export interface FAQ {
  id: string;
  questions: string[];
  simple: string;
  detailed: string;
  expert: string;
  /** Simple Hindi version (Devanagari). */
  hi?: string;
  sources: string[];
  actions?: ActionId[];
  followUp?: string;
}

export const FAQS: FAQ[] = [
  {
    id: 'why-slow',
    questions: ['Why does the magnet slow down in copper?', 'why does the magnet fall slowly through metal', 'why slow copper tube', 'why does copper slow it down'],
    simple:
      'The falling magnet makes **swirling electric currents** in the copper (eddy currents).\n\n- Those currents act like **little magnets**.\n- They **push back** against the falling magnet.\n- So it drifts down slowly instead of dropping.\n\n**Key idea:** copper isn’t magnetic, but it *conducts* electricity, and that’s what matters.',
    detailed:
      '### Step by step\n- As the magnet falls, the **magnetic flux** through the tube wall changes: increasing below the magnet, decreasing above it.\n- By **Faraday’s law**, a changing flux induces an EMF, which drives **eddy currents** around the wall.\n- By **Lenz’s law**, those currents create fields that **oppose** the change: the region below repels the magnet and the region above attracts it back.\n- Both forces point **up**, so they oppose gravity.\n\nThe faster it falls, the stronger the push, so it soon reaches a steady **terminal speed**.',
    expert:
      'The wall behaves as a continuum of coaxial rings. The dipole’s flux Φ(z) through each ring changes at rate (dΦ/dz)·v, inducing ℰ = −dΦ/dt and current dI = ℰ/R with R = 2πa/(σw dz). Energy balance F·v = ∑ℰ²/R gives a drag **F = −kv** with, for a thin wall (Levin et al., 2006):\n\n`k = 45 μ₀² μ² σ w / (1024 a⁴)`\n\nTerminal speed `v_t = mg/k`, approached with time constant τ = m/k (tens of ms in copper).',
    hi: 'गिरता हुआ चुंबक तांबे की नली में **घूमती हुई विद्युत धाराएँ** (एडी करंट / भंवर धाराएँ) बनाता है।\n\n- ये धाराएँ **छोटे चुंबकों** की तरह काम करती हैं।\n- ये गिरते चुंबक को **ऊपर की ओर धक्का** देती हैं।\n- इसलिए चुंबक धीरे-धीरे गिरता है।\n\n**मुख्य बात:** तांबा चुंबकीय नहीं है, पर वह बिजली का **चालक** है।',
    sources: ['why-slow', 'faraday', 'lenz', 'eddy', 'terminal'],
    actions: ['xray'],
    followUp: 'Do you want to see why the current direction matters? Try X-Ray mode.',
  },
  {
    id: 'eddy',
    questions: ['What is an eddy current?', 'eddy currents meaning', 'what are eddy currents'],
    simple: '**Eddy currents** are loops of electricity that **swirl inside a piece of metal** when a magnet moves near it, like little whirlpools in a river.\n\nIn the tube they swirl around the wall just above and just below the magnet.',
    detailed:
      'An eddy current is an **induced current that circulates inside a solid conductor** when the magnetic flux through it changes.\n\n- In the Lazy Tube, think of the wall as a stack of rings.\n- Below the magnet, flux increases, so current circulates one way.\n- Above the magnet, flux decreases, so current circulates the opposite way.\n- Their magnetic fields oppose the motion: **magnetic damping**.',
    expert:
      'Eddy currents follow from the induced electric field ∮E·dl = −dΦ/dt with J = σE in the conductor. In the axisymmetric tube geometry J is purely azimuthal, J_φ(r, z) ∝ σ v ∂Φ/∂z, so current density peaks about one tube radius above and below the dipole, with opposite sign. Dissipated power ∫J²/σ dV equals the drag power kv².',
    hi: '**एडी करंट (भंवर धाराएँ)** वे विद्युत धाराएँ हैं जो धातु के अंदर **गोल-गोल घूमती** हैं, जब उसके पास कोई चुंबक हिलता है, जैसे नदी में भंवर।',
    sources: ['eddy', 'magnetic-damping', 'induced-efield'],
    actions: ['xray'],
    followUp: 'Want to see them? Open X-Ray mode and pause during a drop.',
  },
  {
    id: 'lenz',
    questions: ['What is Lenz’s law?', 'explain lenz law simply', 'lenz law'],
    simple: '**Lenz’s law:** nature **fights change**.\n\nWhen a magnet moves near metal, the currents it creates always **push against** the movement. That’s why the magnet in the copper tube is slowed down, never sped up.',
    detailed:
      '**Lenz’s law** says an induced current always flows in the direction whose magnetic field **opposes the change in flux** that produced it.\n\n- Flux increasing below the magnet → induced field points the other way → **repels**.\n- Flux decreasing above → induced field tries to keep it → **attracts back**.\n\nIt’s really **energy conservation**: if induced currents helped, you’d get free energy.',
    expert:
      'Lenz’s law is the sign in Faraday’s law, ℰ = −dΦ/dt. Combined with the right-hand rule it fixes the current direction: for an N-pole-first fall, the ring below circulates counter-clockwise viewed from above (induced moment +ẑ, repulsive), and the ring above clockwise (attractive). The resulting force is always antiparallel to v, consistent with positive dissipation P = kv² ≥ 0.',
    hi: '**लेंज़ का नियम:** प्रकृति **बदलाव का विरोध** करती है। चुंबक के हिलने से बनी धाराएँ हमेशा उसकी गति का **विरोध** करती हैं। इसलिए तांबे की नली में चुंबक धीमा हो जाता है।',
    sources: ['lenz', 'lenz-tube', 'right-hand'],
    actions: ['xray'],
    followUp: 'Do you want to see which way the currents flow? Open X-Ray mode.',
  },
  {
    id: 'induction',
    questions: ['What is electromagnetic induction?', 'what is faraday law', 'faraday’s law of induction'],
    simple: '**Electromagnetic induction** means making electricity with a **moving magnet** (or a changing magnetic field). No battery needed! If the magnet stops, the electricity stops.',
    detailed:
      '**Faraday’s law:** a **changing magnetic flux** through a loop induces an **EMF** (voltage) around it. The faster the change, the bigger the EMF.\n\n- Moving magnet near a coil → current flows.\n- Magnet still → no current.\n\nThis is how generators and dynamos work, and why the Lazy Tube works.',
    expert: '`ℰ = −dΦ_B/dt`, Φ_B = ∬B·dA. Equivalently ∮E·dl = −∂/∂t ∬B·dA (Maxwell–Faraday). For a dipole moving along the axis of a ring, dΦ/dt = (dΦ/dz)·v, so EMF ∝ v.',
    hi: '**विद्युत चुंबकीय प्रेरण:** बदलते चुंबकीय क्षेत्र से बिजली बनना। चुंबक हिलेगा तो धारा बनेगी; रुकेगा तो धारा भी रुक जाएगी।',
    sources: ['faraday', 'induction-simple', 'flux'],
    actions: ['learn'],
  },
  {
    id: 'thickness',
    questions: ['Why does a thicker copper tube slow the magnet more?', 'thicker wall effect', 'wall thickness braking'],
    simple: 'A **thicker wall** has **more metal** for the swirling currents to flow in. More current means a bigger push back, so the magnet falls **slower**.\n\nBut each extra millimetre helps a little less, because it’s further from the magnet.',
    detailed:
      '- More wall = more conducting paths = **larger eddy currents** = more braking.\n- For thin walls, braking is roughly **proportional to thickness**.\n- Extra metal on the outside is further from the magnet where the field is weaker, so there are **diminishing returns**.\n\nTest it fairly: change only thickness, keep material and inside diameter the same.',
    expert: 'Summing thin shells, dk ∝ σμ² dr / r⁴, so k ∝ (a_in⁻³ − a_out⁻³)/3 ≈ w/a⁴ for w ≪ a. The marginal gain ∂k/∂a_out ∝ a_out⁻⁴ falls as the wall thickens.',
    hi: '**मोटी दीवार** में ज़्यादा धातु होती है, इसलिए ज़्यादा एडी करंट बनते हैं और चुंबक **और धीरे** गिरता है। पर हर अतिरिक्त मिलीमीटर का असर थोड़ा कम होता जाता है।',
    sources: ['thickness', 'k-formula', 'fair-test'],
    actions: ['var-wall'],
    followUp: 'Want to test it? Open the Variable Lab with wall thickness selected.',
  },
  {
    id: 'diameter',
    questions: ['How does tube diameter affect electromagnetic braking?', 'wider tube effect', 'bigger diameter'],
    simple: 'In a **wider tube**, the metal wall is **further from the magnet**. The magnet’s field gets weak very quickly with distance, so the currents are much weaker and the magnet falls **faster**.',
    detailed:
      '- The magnet’s field falls off steeply with distance.\n- A wider bore means smaller flux changes in the wall, so **weaker eddy currents**.\n- Braking drops **sharply**: for thin walls about 1/radius⁴.\n- Example: going from 16 mm to 24 mm inside diameter can cut braking several-fold.\n\nKeep the bore wider than the magnet so it doesn’t rub!',
    expert: 'Thin-wall result k = 45μ₀²μ²σw/(1024a⁴), so v_t ∝ a⁴. Doubling the radius increases terminal speed ~16× (point-dipole limit; finite magnet size softens this when a is close to the magnet radius).',
    hi: '**चौड़ी नली** में दीवार चुंबक से दूर होती है, इसलिए धाराएँ कमज़ोर होती हैं और चुंबक **तेज़** गिरता है।',
    sources: ['diameter', 'k-formula', 'magnetic-field'],
    actions: ['var-diameter'],
    followUp: 'Want to try it? Open the Variable Lab with internal diameter selected.',
  },
  {
    id: 'flux',
    questions: ['What is magnetic flux?', 'flux meaning'],
    simple: '**Magnetic flux** is “how much magnetic field passes through a loop”. Imagine counting the field lines going through a ring: more lines = more flux.',
    detailed: '**Flux (Φ)** = field × area (for a uniform field at right angles): Φ = B·A, measured in **webers**. As the magnet approaches a ring of the tube, more field passes through, so flux increases. As it leaves, flux decreases. It’s the **change** in flux that induces current.',
    expert: 'Φ_B = ∬ B·dA. On-axis dipole through a coaxial ring: Φ(z) = μ₀μa² / [2(a²+z²)^{3/2}], maximal when the magnet is in the ring’s plane.',
    hi: '**चुंबकीय फ्लक्स** = किसी छल्ले से कितना चुंबकीय क्षेत्र गुज़र रहा है। जितनी ज़्यादा क्षेत्र रेखाएँ, उतना ज़्यादा फ्लक्स।',
    sources: ['flux', 'faraday'],
  },
  {
    id: 'emf',
    questions: ['How do I calculate induced EMF?', 'calculate emf', 'induced voltage calculation'],
    simple: 'Induced voltage = **how fast the magnetic flux changes**. Faster magnet → faster change → bigger voltage.',
    detailed: 'Use **Faraday’s law**: `ℰ = −ΔΦ/Δt`.\n\n- Find the flux before and after.\n- Divide the change by the time taken.\n- The minus sign (Lenz) tells you the direction opposes the change.\n\nFor one ring of the tube this is about a millivolt: small, but copper’s tiny resistance makes the current large.',
    expert:
      'For a ring of radius a at axial distance z: Φ(z) = μ₀μa²/[2(a²+z²)^{3/2}], so\n\n`ℰ = |dΦ/dz|·v = 3μ₀μa²z v / [2(a²+z²)^{5/2}]`\n\nWith μ ≈ 1.3 A·m², a ≈ 8.75 mm, z = 12 mm, v = 0.3 m/s → ℰ ≈ 1 mV (project estimate).',
    sources: ['emf-calc', 'faraday', 'emf-glossary'],
    actions: ['xray'],
  },
  {
    id: 'terminal',
    questions: ['Why does the magnet eventually reach a nearly constant speed?', 'terminal velocity', 'why constant speed'],
    simple: 'The faster the magnet falls, the **harder the currents push back**. Soon the push is as big as gravity’s pull. Then the forces **balance**, and the magnet stops speeding up.',
    detailed: '- Braking force grows with speed: **F = k·v**.\n- When **k·v = m·g**, the net force is zero.\n- The magnet then moves at **terminal speed** v = mg/k.\n- In copper this happens within a fraction of a second, so most of the fall is at a steady speed.',
    expert: 'm dv/dt = mg − kv ⇒ v(t) = v_t(1 − e^{−t/τ}), v_t = mg/k, τ = m/k. With k ≈ 0.29 N·s/m and m ≈ 10 g (FluxQuest default copper tube, model estimate), τ ≈ 35 ms and v_t ≈ 35 cm/s.',
    hi: 'जितना तेज़ चुंबक गिरता है, धाराएँ उतना **ज़्यादा विरोध** करती हैं। जब यह विरोध गुरुत्व के बराबर हो जाता है, तो चुंबक **एक जैसी गति** से गिरता है।',
    sources: ['terminal', 'force-velocity', 'sim-numbers'],
    actions: ['lab'],
  },
  {
    id: 'fair',
    questions: ['How can I make my physical Agastya experiment fair?', 'how do i make my experiment fair', 'fair test lazy tube'],
    simple: '**Change only ONE thing** at a time and keep everything else the same:\n\n- Same magnet, same pole down\n- Same start and finish lines\n- Same way of releasing (don’t push!)\n- Same timer\n- **3 tries** for each tube, then average',
    detailed:
      '### Fair-test checklist\n- **One variable** changed (e.g. only material).\n- **Controls:** same magnet, length, inside diameter, wall thickness, release point, timing method.\n- **Release gate** or card slide, never a hand push.\n- Tubes **vertical** and clamped.\n- **Repeat** ≥3 trials and average; note outliers.\n- Don’t cut viewing windows: they change the braking (P022).',
    expert: 'Treat fall time as the dependent variable with independent variable X and controls fixed. Quantify random error with repeated trials (report mean ± spread); reduce systematic error with automated timing (light gates or frame-counted video). Reaction time (~0.2 s) dominates uncertainty for short plastic drops.',
    hi: 'एक बार में **सिर्फ़ एक चीज़** बदलें: वही चुंबक, वही शुरुआत और अंत की रेखा, वही टाइमर। हर नली के लिए **3 बार** प्रयोग करें और औसत निकालें।',
    sources: ['fair-test', 'timing', 'slit-tube'],
    actions: ['model'],
    followUp: 'Want a printable observation table? Open the Real Model Guide.',
  },
  {
    id: 'limits',
    questions: ['What are the limitations of my simulation?', 'how accurate is the simulation', 'is the simulation realistic'],
    simple: 'The simulation shows the **right patterns**, but it’s a simplified model. Real tubes and magnets will give slightly different times. That’s why testing the **real model** matters!',
    detailed:
      '### Limitations\n- Magnet treated as a **point dipole** with a calibrated correction (**η = 0.16**, an assumption).\n- No tilting, spinning or rubbing.\n- Self-inductance / skin effect ignored.\n- Typical conductivities; real alloys vary.\n- Tube drawn 5× wider in 3D for visibility.\n\n**Trends: reliable. Exact seconds: approximate.**',
    expert: 'Model: m v̇ = mg − k(z)v − c v², k from the Levin et al. thin-wall result integrated over wall thickness, ×η (finite-size correction, calibrated), end-ramp k(z). Quasi-static (low magnetic Reynolds number) assumption; neglects the eddy-current self-field. Uncertainty in η and σ propagates linearly into k.',
    sources: ['sim-limits', 'sim-model', 'skin'],
    actions: ['learn'],
  },
  {
    id: 'derivation',
    questions: ['Explain the mathematical derivation of electromagnetic braking.', 'derive the braking force', 'show me the equation'],
    simple: 'Here’s the big idea: **faster magnet → bigger currents → bigger push back**. So the braking force is proportional to speed: **F = k × v**.',
    detailed: '1. Flux through a ring depends on distance to the magnet.\n2. Moving magnet → flux changes at a rate ∝ **v**.\n3. EMF ∝ v, current ∝ v (Ohm’s law).\n4. Force from currents on magnet ∝ current, so ∝ **v**.\n\nSo **F = k·v**, with k bigger for better conductors, thicker walls and stronger magnets.',
    expert:
      '1. Ring at z, radius a, height dz: R = 2πa/(σw dz).\n2. Φ(z) = μ₀μa²/[2(a²+z²)^{3/2}].\n3. ℰ = (dΦ/dz)·v.\n4. Power: P = ∫ ℰ²/R = σw v²/(2πa) ∫ (dΦ/dz)² dz.\n5. ∫(dΦ/dz)² dz over all z gives (45π/512)·μ₀²μ²/a³ ⇒ P = k v² with\n\n`k = 45 μ₀² μ² σ w / (1024 a⁴)`\n\n6. F·v = P ⇒ F = kv (Levin, da Silveira & Rizzato 2006).',
    sources: ['derivation', 'k-formula', 'force-velocity'],
    actions: ['learn'],
  },
  {
    id: 'regen',
    questions: ['Compare eddy-current braking with regenerative braking.', 'regenerative braking vs magnetic braking'],
    simple: 'Both use magnets to slow things down.\n\n- **Eddy-current brake:** the energy becomes **heat** (wasted).\n- **Regenerative brake:** the energy charges a **battery** (saved!).',
    detailed:
      '- **Where current flows:** swirling inside solid metal vs. through a circuit to a battery.\n- **Energy:** turned into heat vs. mostly recovered.\n- **Needs power?** No vs. needs electronics.\n- **Used in:** trains, roller coasters, Lazy Tube vs. electric cars, e-bikes, trains.',
    expert: 'Both exploit motional EMF. Eddy brakes dissipate P = kv² in bulk resistance (no electrical load). Regenerative systems route the generator EMF into a controlled load (battery/inverter), with braking torque set by the load current; efficiency is limited by winding and conversion losses and falls at low speed, which is why vehicles combine it with friction brakes.',
    sources: ['regen-vs-eddy', 'apps'],
  },
  {
    id: 'superconductor',
    questions: ['What would happen in a superconducting tube?', 'superconductor tube magnet'],
    simple: 'A superconductor has **zero resistance**, so the currents never fade. The magnet would be **held up** and might float instead of falling slowly! (This needs very cold temperatures, so it’s a thought experiment, not a classroom test.)',
    detailed: 'In our model braking ∝ conductivity, so a perfect conductor gives terminal speed → 0. Real superconductors also **expel or trap magnetic flux** (Meissner effect, flux pinning), so the magnet can **levitate** or get stuck. The simple F = kv model stops applying.',
    expert: 'As σ → ∞ the magnetic diffusion time → ∞ and induced currents persist (flux through each ring is conserved), so the interaction becomes conservative rather than dissipative, i.e. a magnetic spring rather than a dashpot. Type-II superconductors add flux pinning. Experimental work needs cryogenic expertise and safety controls.',
    sources: ['superconductor', 'skin'],
    followUp: 'This is a thought experiment. Please don’t try cryogenic cooling without expert supervision.',
  },
  {
    id: 'apps',
    questions: ['How is this used in induction cooktops, roller coasters, metal detectors, and trains?', 'real world applications eddy currents', 'where are eddy currents used'],
    simple: 'Eddy currents are everywhere!\n\n- 🚄 **Train brakes:** slow trains without touching the rails\n- 🎢 **Roller coasters:** smooth stops at the end\n- 🍳 **Induction cooktops:** heat the pan directly\n- 🔍 **Metal detectors:** find hidden metal',
    detailed:
      '- **Trains & coasters:** metal fins/rails move past strong magnets → eddy currents → braking that works even without power.\n- **Induction cooktops:** a fast-changing field induces eddy currents in the pan base → heat.\n- **Metal detectors:** a coil’s changing field induces eddy currents in buried metal → their field is detected.\n- **Recycling:** eddy-current separators throw aluminium cans off conveyor belts.',
    expert: 'Linear eddy-current brakes provide F ∝ v at low speed (dissipative, fail-safe); induction heating uses high-frequency fields where the skin depth δ = √(2/(ωμσ)) concentrates heating near the surface; pulse-induction detectors sense the decay of eddy currents in targets.',
    sources: ['apps', 'cooktop', 'detector'],
  },
  {
    id: 'magnet',
    questions: ['What is a magnet?', 'magnet meaning'],
    simple: 'A **magnet** is an object that pulls on iron and pushes or pulls other magnets. It has a **north** and a **south** pole. Opposite poles attract, same poles repel.',
    detailed: 'A magnet produces a **magnetic field** around it. Inside strong magnets like neodymium, tiny magnetic regions are all lined up. Magnets attract iron, nickel and cobalt but **not** copper, aluminium or plastic.',
    expert: 'A permanent magnet has a net magnetisation M; far away it acts as a magnetic dipole of moment μ = M·V. An NdFeB magnet with remanence ≈ 1.2 T and volume 1.36 cm³ has μ ≈ 1.3 A·m².',
    hi: '**चुंबक** वह वस्तु है जो लोहे को खींचती है। इसके दो ध्रुव होते हैं: **उत्तर** और **दक्षिण**। विपरीत ध्रुव आकर्षित करते हैं, समान ध्रुव दूर धकेलते हैं।',
    sources: ['magnet-basics', 'magnetic-field'],
  },
  {
    id: 'cycloid',
    questions: ['What does cycloid mean?', 'cycloid'],
    simple: 'A **cycloid** is the curvy path made by a dot on a rolling wheel. It’s not part of our magnet experiment, because our magnet falls in a straight line!',
    detailed: 'A **cycloid** is the curve traced by a point on the rim of a circle rolling along a straight line. It shows up in physics in the **brachistochrone** (fastest slide) problem and in the path of a charged particle in **crossed electric and magnetic fields**.',
    expert: 'Parametric form: x = r(θ − sin θ), y = r(1 − cos θ). A charge starting at rest in uniform crossed E and B fields follows a cycloid with drift speed E/B.',
    sources: ['cycloid'],
  },
  {
    id: 'plastic',
    questions: ['Why doesn’t plastic slow the magnet?', 'why does the magnet fall fast in plastic'],
    simple: 'Plastic **doesn’t conduct electricity**, so no swirling currents can form. Nothing pushes back, and the magnet falls almost freely (about 0.45 s for 1 m).',
    detailed: 'The changing field still creates an induced electric field in plastic, but plastic has **no free electrons**, so no eddy currents flow (J = σE with σ ≈ 0). No current means no opposing field and no braking. Fall time ≈ √(2h/g).',
    expert: 'σ ≈ 0 ⇒ k ≈ 0; residual drag is air resistance (≈½ρC_dAv², negligible). t = √(2h/g) = 0.452 s for h = 1 m.',
    hi: 'प्लास्टिक बिजली का **चालक नहीं** है, इसलिए उसमें धाराएँ नहीं बनतीं। कोई विरोध नहीं होता और चुंबक लगभग मुक्त रूप से गिरता है।',
    sources: ['plastic', 'conductor-insulator', 'induced-efield'],
    actions: ['lab'],
  },
  {
    id: 'energy',
    questions: ['Where does the lost kinetic energy go?', 'where does the energy go', 'does the tube get hot'],
    simple: 'The magnet’s energy turns into a tiny bit of **heat** in the tube, too little to feel.',
    detailed: 'The eddy currents flow through the metal’s resistance, which turns electrical energy into **heat** (like a toaster wire, much weaker). At terminal speed, **all** the height energy lost becomes heat. A 10 g magnet falling 1 m releases only about 0.1 J.',
    expert: 'P = kv² = ∫J²/σ dV; at terminal speed P = mg v_t. Total heat ≈ mgh − ½mv_f² ≈ 0.1 J for 10 g over 1 m, giving ΔT ~ 10⁻⁴ K for a 0.7 kg copper tube (estimate).',
    hi: 'चुंबक की ऊर्जा नली में बहुत थोड़ी **गर्मी** में बदल जाती है, इतनी कम कि महसूस नहीं होती।',
    sources: ['energy', 'heat-estimate'],
    actions: ['lab'],
  },
  {
    id: 'copper-magnetic',
    questions: ['Is copper magnetic?', 'does a magnet stick to copper', 'is aluminium magnetic'],
    simple: '**No!** A magnet doesn’t stick to copper or aluminium. The slowing happens because copper **conducts electricity**, not because it’s magnetic.',
    detailed: 'Copper is very weakly **diamagnetic** and aluminium weakly **paramagnetic**. Both effects are far too tiny to notice. The braking comes from **induced eddy currents**, which need a conductor, not a magnetic material.',
    expert: 'Volume susceptibilities: Cu χ ≈ −1×10⁻⁵, Al χ ≈ +2×10⁻⁵, negligible compared with the eddy-current interaction, which scales with σ, not χ.',
    hi: '**नहीं!** चुंबक तांबे से नहीं चिपकता। तांबा बिजली का **चालक** है, इसी वजह से चुंबक धीमा होता है।',
    sources: ['copper-not-magnetic', 'conductor-insulator'],
  },
];
