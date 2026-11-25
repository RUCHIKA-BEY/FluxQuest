/* Sanity checks for the physics model's qualitative guarantees. Run: npx tsx scripts/check-physics.ts */
import { DEFAULT_PARAMS, simulate, freeFallTime, type ExperimentParams } from '../src/lib/physics';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) failures++;
};
const T = (p: Partial<ExperimentParams>) => simulate({ ...DEFAULT_PARAMS, ...p }, 1, false).summary;

const base = T({});
console.log('copper default:', base);
const plastic = T({ material: 'plastic' });
check('plastic ≈ free fall', Math.abs(plastic.fallTime - freeFallTime(1)) / freeFallTime(1) < 0.02, plastic.fallTime.toFixed(3) + ' s');
const al = T({ material: 'aluminium' });
const br = T({ material: 'brass' });
check('Cu slower than Al slower than brass slower than plastic', base.fallTime > al.fallTime && al.fallTime > br.fallTime && br.fallTime > plastic.fallTime,
  [base, al, br, plastic].map((s) => s.fallTime.toFixed(2)).join(' > '));
check('copper terminal speed is classroom-plausible (5–60 cm/s)', base.terminalSpeed > 0.05 && base.terminalSpeed < 0.6, (base.terminalSpeed * 100).toFixed(1) + ' cm/s');
const thick = [1, 2, 3, 4].map((w) => T({ wallMm: w }).fallTime);
check('thicker wall → slower', thick.every((x, i) => i === 0 || x > thick[i - 1]), thick.map((x) => x.toFixed(2)).join(', '));
check('diminishing returns with thickness', thick[3] - thick[2] < thick[1] - thick[0]);
const dia = [14, 18, 24, 30].map((d) => T({ innerDiameterMm: d }).fallTime);
check('wider bore → faster', dia.every((x, i) => i === 0 || x < dia[i - 1]), dia.map((x) => x.toFixed(2)).join(', '));
const str = [0.5, 1, 1.5].map((m) => T({ magnetStrength: m }).fallTime);
check('stronger magnet → slower', str[0] < str[1] && str[1] < str[2], str.map((x) => x.toFixed(2)).join(', '));
check('energy: heat fraction in (0,1]', base.heatFraction > 0.5 && base.heatFraction <= 1, base.heatFraction.toFixed(3));
const r1 = simulate(DEFAULT_PARAMS, 42).summary.fallTime;
const r2 = simulate(DEFAULT_PARAMS, 42).summary.fallTime;
const r3 = simulate(DEFAULT_PARAMS, 43).summary.fallTime;
check('same seed is repeatable', r1 === r2);
check('different seeds vary a little (<6%)', r1 !== r3 && Math.abs(r1 - r3) / r1 < 0.06, `${r1.toFixed(3)} vs ${r3.toFixed(3)}`);
const extreme = simulate({ material: 'copper', wallMm: 4, innerDiameterMm: 13, magnetStrength: 1.5, dropHeightM: 1.5 }, 1);
check('extreme case finishes with ≤ 2000 samples', extreme.samples.length <= 2000, `${extreme.summary.fallTime.toFixed(1)} s, ${extreme.samples.length} samples`);

if (failures) {
  console.error(`${failures} physics check(s) failed`);
  process.exit(1);
}
console.log('All physics checks passed.');
