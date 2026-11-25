import { useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoute, href } from '../lib/router';
import { useSettings } from '../store/settings';
import { Card, CardHeader, SectionHeading } from '../components/ui/Card';
import { Segmented } from '../components/ui/Controls';
import { Icon, type IconName } from '../components/ui/Icon';
import { EddyDiagram, EnergyDiagram, FluxDiagram, LenzDiagram } from './learn/Diagrams';
import { ETA, MAGNET } from '../lib/physics';

type Level = 'simple' | 'intermediate' | 'advanced';

interface Topic {
  id: string;
  icon: IconName;
  title: string;
  diagram?: ReactNode;
  simple: ReactNode;
  intermediate: ReactNode;
  advanced: ReactNode;
}

const Key = ({ children }: { children: ReactNode }) => <strong className="rounded bg-sage-400/15 px-1 text-sage-200">{children}</strong>;
const Eq = ({ children }: { children: ReactNode }) => <p className="my-2 overflow-x-auto rounded-lg bg-espresso-950/80 px-3 py-2 font-mono text-sm text-oat-50">{children}</p>;

const TOPICS: Topic[] = [
  {
    id: 'induction',
    icon: 'bolt',
    title: 'What is electromagnetic induction?',
    diagram: <FluxDiagram />,
    simple: (
      <p>
        When a magnet <Key>moves</Key> near metal, it can make electricity flow in the metal, with no battery needed! A magnet sitting still does nothing. It is the <em>change</em> that matters.
      </p>
    ),
    intermediate: (
      <p>
        The amount of magnetic field passing through a loop is called <Key>magnetic flux</Key>. When the flux through a loop of conductor changes, a voltage (EMF) is induced around the loop. Faster change → bigger
        voltage. This is <strong>Faraday’s law</strong>.
      </p>
    ),
    advanced: (
      <>
        <p>Faraday’s law relates the EMF around a closed path to the rate of change of flux through it:</p>
        <Eq>ℰ = −dΦ_B/dt,   Φ_B = ∬ B · dA</Eq>
        <p>
          For an on-axis dipole μ at distance z from a coaxial ring of radius a: Φ = μ₀μa² / (2(a² + z²)^3/2). The ring sees dΦ/dt = (dΦ/dz)·v, so the EMF is proportional to the magnet’s speed.
        </p>
      </>
    ),
  },
  {
    id: 'eddy',
    icon: 'replay',
    title: 'What is an eddy current?',
    diagram: <EddyDiagram />,
    simple: (
      <p>
        Inside the metal tube, the moving magnet makes electrons swirl round and round in loops, like little whirlpools in a river. These swirling currents are called <Key>eddy currents</Key>. Plastic has no free
        electrons, so it gets no eddy currents.
      </p>
    ),
    intermediate: (
      <p>
        A tube wall is like a stack of metal rings. Below the magnet, flux through each ring is <strong>increasing</strong>. Above it, flux is <strong>decreasing</strong>. So currents circulate in
        <Key>opposite directions</Key> above and below the magnet. Better conductors (copper &gt; aluminium &gt; brass) carry bigger currents for the same EMF.
      </p>
    ),
    advanced: (
      <>
        <p>The induced electric field drives a current density in the conductor (Ohm’s law, local form):</p>
        <Eq>J = σE,   ∮ E · dl = −dΦ/dt</Eq>
        <p>For a thin ring of radius a, wall thickness w and height dz, the resistance is R = 2πa / (σ w dz), so the current is I = ℰ/R and grows with σ and w.</p>
      </>
    ),
  },
  {
    id: 'lenz',
    icon: 'shield',
    title: 'What is Lenz’s law?',
    diagram: <LenzDiagram />,
    simple: (
      <p>
        Nature resists change! The eddy currents become little magnets that <Key>push back</Key> against the falling magnet. The loop below pushes it up. The loop above pulls it up.
      </p>
    ),
    intermediate: (
      <p>
        <strong>Lenz’s law:</strong> an induced current always flows in the direction that <Key>opposes the change</Key> that caused it. The falling magnet increases the flux below it, so the induced
        current makes a field pointing the opposite way. The result is an upward magnetic force.
      </p>
    ),
    advanced: (
      <>
        <p>
          The minus sign in ℰ = −dΦ/dt is Lenz’s law. It follows from energy conservation. If induced currents <em>helped</em> the motion, the magnet would speed up by itself and create energy from nothing.
          The force on the magnet equals the force from the currents on it:
        </p>
        <Eq>F = −∑ I_ring (∇(m · B_ring))  ⇒  F_z = −k v</Eq>
      </>
    ),
  },
  {
    id: 'slow',
    icon: 'magnet',
    title: 'Why does the magnet slow down and reach a steady speed?',
    simple: (
      <p>
        The faster the magnet falls, the stronger the push-back. Soon the push-back is <Key>as strong as gravity</Key>. Then the magnet stops speeding up and drifts down at a steady speed.
      </p>
    ),
    intermediate: (
      <p>
        The braking force is proportional to speed: F = k·v. When k·v equals the weight m·g, the forces balance and the magnet moves at the <Key>terminal speed</Key> v<sub>t</sub> = mg/k. A copper tube can make this just a few centimetres per second.
      </p>
    ),
    advanced: (
      <>
        <p>With m·dv/dt = mg − kv the solution is exponential approach to terminal speed:</p>
        <Eq>v(t) = v_t (1 − e^(−t/τ)),   v_t = mg/k,   τ = m/k</Eq>
        <p>For a thin-walled tube and a point dipole (Levin, da Silveira &amp; Rizzato, Am. J. Phys. 74, 815 (2006)):</p>
        <Eq>k = 45 μ₀² μ² σ w / (1024 a⁴)</Eq>
        <p>
          That is why braking grows with conductivity σ, wall thickness w and magnet strength squared, and drops steeply (∝ a⁻⁴) as the tube gets wider.
        </p>
      </>
    ),
  },
  {
    id: 'energy',
    icon: 'flame',
    title: 'Where does the lost energy go?',
    diagram: <EnergyDiagram />,
    simple: (
      <p>
        The magnet loses height energy, but it doesn’t speed up much. The energy turns into a tiny amount of <Key>heat</Key> in the metal tube, far too little to feel.
      </p>
    ),
    intermediate: (
      <p>
        The eddy currents flow through a metal with some resistance, and resistance turns electrical energy into heat (like a toaster wire, but much weaker). At terminal speed <Key>all</Key> the lost
        gravitational energy becomes heat.
      </p>
    ),
    advanced: (
      <>
        <p>Power dissipated equals braking force × speed:</p>
        <Eq>P = F v = k v² = ∫ J²/σ dV</Eq>
        <p>
          At terminal speed P = mg·v<sub>t</sub>. For a 10 g magnet at 30 cm/s that is about 30 mW, spread over many grams of copper. The temperature rise is far below 1 °C.
        </p>
      </>
    ),
  },
];

const APPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'bolt', title: 'Magnetic brakes on trains', text: 'Eddy-current brakes slow high-speed trains without touching the rails, so there is no wear and no squeal.' },
  { icon: 'flame', title: 'Induction cooktops', text: 'A rapidly changing magnetic field induces eddy currents in the pan’s base, which heat up. The cooktop itself stays cooler.' },
  { icon: 'target', title: 'Metal detectors', text: 'A changing field induces eddy currents in buried metal. Their own magnetic field is detected by the coil.' },
  { icon: 'arrowDown', title: 'Roller coasters & drop towers', text: 'Fins pass between strong magnets at the end of the ride. Eddy currents bring the cars smoothly to a stop, even without power.' },
  { icon: 'replay', title: 'Regenerative braking', text: 'Electric cars run their motor as a generator. Induction slows the car AND recharges the battery, instead of wasting the energy as heat.' },
];

export default function Learn() {
  const route = useRoute();
  const advancedMode = useSettings((s) => s.advanced);
  const [level, setLevel] = useState<Level>(advancedMode ? 'advanced' : 'simple');
  const [openId, setOpenId] = useState<string>('induction');
  useEffect(() => {
    if (route.query.get('tab') === 'limits') setTimeout(() => document.getElementById('limits')?.scrollIntoView({ behavior: 'smooth' }), 400);
  }, [route.query]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <SectionHeading eyebrow="Step 6 · Explain" title="Learn the physics">
        Choose how deep you want to go. Start simple, then level up when you’re ready.
      </SectionHeading>

      <div className="sticky top-16 z-20 -mx-4 bg-espresso-950/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:px-0">
        <Segmented<Level>
          label="Explanation level"
          value={level}
          onChange={setLevel}
          options={[
            { value: 'simple', label: '🌱 Simple' },
            { value: 'intermediate', label: '🔬 Intermediate' },
            { value: 'advanced', label: '🎓 Advanced' },
          ]}
        />
      </div>

      <Card className="mt-6 border-sage-500/60 p-5">
        <p className="text-lg text-oat-100">
          {level === 'simple' && '“Moving magnets create electricity-like effects in metal, and those effects push back.”'}
          {level === 'intermediate' && '“A changing magnetic field induces eddy currents in the conducting tube. By Lenz’s law their field opposes the change, which brakes the magnet.”'}
          {level === 'advanced' && '“Faraday induction in a conducting tube produces a velocity-proportional drag F = −kv, with k ∝ σμ²w/a⁴, dissipating mgv as Joule heat at terminal velocity.”'}
        </p>
      </Card>

      <div className="mt-6 space-y-4">
        {TOPICS.map((t) => {
          const open = openId === t.id;
          return (
            <Card key={t.id} className="overflow-hidden">
              <h2>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`topic-${t.id}`}
                  onClick={() => setOpenId(open ? '' : t.id)}
                  className="flex min-h-[64px] w-full items-center gap-3 px-5 text-left"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-400/15 text-sage-300">
                    <Icon name={t.icon} size={20} />
                  </span>
                  <span className="fq-h3 flex-1 text-oat-50">{t.title}</span>
                  <Icon name="arrowDown" size={18} className={`text-oat-300 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
              </h2>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div id={`topic-${t.id}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                    <div className={`grid gap-6 px-5 pb-6 ${t.diagram ? 'md:grid-cols-[1fr_320px]' : ''}`}>
                      <AnimatePresence mode="wait">
                        <motion.div key={level} className="fq-prose text-oat-200" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }}>
                          {t[level]}
                        </motion.div>
                      </AnimatePresence>
                      {t.diagram && <div className="rounded-xl bg-espresso-950/70 p-3">{t.diagram}</div>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      <section aria-labelledby="apps" className="mt-14">
        <h2 id="apps" className="fq-h2 text-oat-50">
          Where you’ll find eddy currents
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {APPS.map((a, i) => (
            <motion.li key={a.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <Card className="h-full p-5">
                <CardHeader icon={a.icon} title={a.title} />
                <p className="text-sm text-oat-200">{a.text}</p>
              </Card>
            </motion.li>
          ))}
        </ul>
      </section>

      <section id="limits" aria-labelledby="limits-h" className="mt-14 scroll-mt-24">
        <Card className="p-6">
          <CardHeader icon="info" eyebrow="Honest science" title={<span id="limits-h">Limitations of this simulation</span>} />
          <div className="grid gap-6 text-sm text-oat-200 md:grid-cols-3">
            <div>
              <p className="font-semibold text-success">✓ Established physics</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Faraday’s and Lenz’s laws</li>
                <li>Braking force ∝ speed, so a terminal speed exists</li>
                <li>Braking grows with conductivity and wall thickness and falls with tube radius</li>
                <li>Lost energy becomes heat</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-eddy">◆ Project assumptions</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Point-dipole formula with a finite-size correction η = {ETA} (calibrated, not measured)</li>
                <li>Magnet: {MAGNET.diameterMm} × {MAGNET.lengthMm} mm NdFeB, {MAGNET.massKg * 1000} g, μ = {MAGNET.dipoleMoment} A·m²</li>
                <li>Typical conductivities (real alloys vary)</li>
                <li>Braking halves near the open tube ends</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-warn">✕ Not modelled</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Magnet tilting, spinning or rubbing the wall</li>
                <li>Skin effect / self-inductance at high speed</li>
                <li>Temperature changing the conductivity</li>
                <li>Exact timings: use the real Lazy Tube to measure them!</li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-sm text-oat-300">
            Want to test the model? Measure real fall times with the <a href={href('model')} className="font-semibold text-sage-300 underline">physical model guide</a> and compare.
          </p>
        </Card>
      </section>
    </div>
  );
}
