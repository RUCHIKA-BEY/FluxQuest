/* Retrieval quality checks for Magneto. Run: npx tsx scripts/check-retrieval.ts */
import { retrieve } from '../src/chat/retrieval';

const cases: [string, string | null, string | null][] = [
  // [question, expected top-5 passage id (or null), expected FAQ id (or null for "none / don't care")]
  ['What is a magnet?', 'magnet-basics', 'magnet'],
  ['What does cycloid mean?', 'cycloid', 'cycloid'],
  ['Why does the magnet slow down in copper?', 'why-slow', 'why-slow'],
  ['What is an eddy current?', 'eddy', 'eddy'],
  ['What is Lenz’s law?', 'lenz', 'lenz'],
  ['Why does a thicker copper tube slow the magnet more?', 'thickness', 'thickness'],
  ['How does tube diameter affect electromagnetic braking?', 'diameter', 'diameter'],
  ['What is magnetic flux?', 'flux', 'flux'],
  ['How do I calculate induced EMF?', 'emf-calc', 'emf'],
  ['Why does the magnet eventually reach a nearly constant speed?', 'terminal', 'terminal'],
  ['How can I make my physical Agastya experiment fair?', 'fair-test', 'fair'],
  ['What are the limitations of my simulation?', 'sim-limits', 'limits'],
  ['Explain the mathematical derivation of electromagnetic braking.', 'derivation', 'derivation'],
  ['Compare eddy-current braking with regenerative braking.', 'regen-vs-eddy', 'regen'],
  ['What would happen in a superconducting tube?', 'superconductor', 'superconductor'],
  ['How is this used in induction cooktops, roller coasters, metal detectors, and trains?', 'apps', 'apps'],
  ['Why did copper slow the magnet more than aluminium?', 'material-order', null],
  ['तांबे की नली में चुंबक धीरे क्यों गिरता है?', 'why-slow', null],
  ['is copper magnetic', 'copper-not-magnetic', 'copper-magnetic'],
];
const offTopic = ['Who won the cricket world cup in 2011?', 'Write me a poem about my cat', 'What is the capital of France?'];

let fail = 0;
for (const [q, pid, fid] of cases) {
  const r = retrieve(q);
  const ids = r.results.map((x) => x.passage.id);
  const okP = !pid || ids.includes(pid);
  const okF = fid === null || r.faq?.faq.id === fid;
  const okC = r.band !== 'low';
  if (!(okP && okF && okC)) fail++;
  console.log(`${okP && okF && okC ? 'PASS' : 'FAIL'} [${r.band} ${r.confidence.toFixed(2)}] faq=${r.faq?.faq.id ?? '-'}(${r.faq?.score.toFixed(2) ?? ''}) top=${ids.slice(0, 3).join(',')}  ← ${q}`);
}
for (const q of offTopic) {
  const r = retrieve(q);
  const ok = r.band === 'low' && !r.faq;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} off-topic [${r.band} ${r.confidence.toFixed(2)}] faq=${r.faq?.faq.id ?? '-'} unknown=${r.unknownTerms.join(',')}  ← ${q}`);
}
if (fail) {
  console.error(`${fail} retrieval check(s) failed`);
  process.exit(1);
}
console.log('All retrieval checks passed.');
