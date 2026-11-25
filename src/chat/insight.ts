/**
 * Concept-linked experiment insight: explains the student's OWN results and suggests a controlled next test.
 * Uses only numbers from the local experiment log plus the physics model, so it is never invented.
 */
import { useLab, type RunRecord } from '../store/lab';
import { MATERIALS, type MaterialId } from '../lib/materials';
import { brakingCoefficient, type ExperimentParams } from '../lib/physics';
import { effectOf } from '../lib/patterns';
import type { ActionId } from './knowledge/passages';

const MAT_WORDS: Record<MaterialId, RegExp> = {
  copper: /copper|तांब|ताँब|\bcu\b/i,
  aluminium: /alumin|एल्युमिन|\bal\b/i,
  brass: /brass|पीतल/i,
  plastic: /plastic|pvc|acrylic|प्लास्टिक/i,
};

const others = (a: ExperimentParams, b: ExperimentParams) =>
  a.wallMm === b.wallMm && a.innerDiameterMm === b.innerDiameterMm && a.magnetStrength === b.magnetStrength && a.dropHeightM === b.dropHeightM;

const mean = (rs: RunRecord[]) => rs.reduce((s, r) => s + r.summary.fallTime, 0) / rs.length;

export interface Insight {
  text: string;
  actions: ActionId[];
}

export function experimentInsight(question: string): Insight | null {
  const { runs, params } = useLab.getState();
  const q = question.toLowerCase();
  const mats = (Object.keys(MAT_WORDS) as MaterialId[]).filter((m) => MAT_WORDS[m].test(question));

  // Two materials compared → use the student's fair runs.
  if (mats.length >= 2) {
    const [a, b] = mats;
    // Prefer a settings combination where BOTH materials were actually tested (a fair pair).
    const pairRef = [...runs].reverse().find((r) => r.params.material === a && runs.some((o) => o.params.material === b && others(o.params, r.params)))?.params;
    const ref = pairRef ?? [...runs].reverse().find((r) => r.params.material === a || r.params.material === b)?.params ?? params;
    const ra = runs.filter((r) => r.params.material === a && others(r.params, ref));
    const rb = runs.filter((r) => r.params.material === b && others(r.params, ref));
    const ka = brakingCoefficient({ ...ref, material: a });
    const kb = brakingCoefficient({ ...ref, material: b });
    const sa = MATERIALS[a].conductivity;
    const sb = MATERIALS[b].conductivity;
    const condLine =
      sa && sb
        ? `${MATERIALS[a].name.split(' ')[0]} conducts about **${(Math.max(sa, sb) / Math.min(sa, sb)).toFixed(1)}×** ${sa > sb ? 'better' : 'worse'} than ${MATERIALS[b].name.split(' ')[0].toLowerCase()}, so the model predicts about ${(Math.max(ka, kb) / Math.min(ka, kb)).toFixed(1)}× stronger braking.`
        : `${MATERIALS[sa ? b : a].name.split(' ')[0]} is an insulator, so it has no eddy currents and no braking.`;
    if (ra.length && rb.length) {
      const ta = mean(ra);
      const tb = mean(rb);
      return {
        text:
          `**From your experiment:** with the same wall (${ref.wallMm} mm), bore (${ref.innerDiameterMm} mm), magnet and height, ` +
          `${MATERIALS[a].name.split(' ')[0]} averaged **${ta.toFixed(2)} s** (${ra.length} run${ra.length > 1 ? 's' : ''}) and ${MATERIALS[b].name.split(' ')[0].toLowerCase()} **${tb.toFixed(2)} s** (${rb.length} run${rb.length > 1 ? 's' : ''}). ` +
          `${condLine}\n\n**Next controlled test:** repeat each tube 3 times, then change only the wall thickness to see if the gap between them grows.`,
        actions: ['var-material', 'var-wall'],
      };
    }
    return {
      text: `**Your experiment:** you haven’t run both of these with the same settings yet. ${condLine}\n\n**Try it:** test both in the Variable Lab with only the material changing.`,
      actions: ['var-material'],
    };
  }

  if (/thick|wall|मोट/.test(q)) {
    const e = effectOf(runs, 'wallMm');
    return {
      text: e
        ? `**From your experiment:** in ${e.pairs} fair comparison${e.pairs > 1 ? 's' : ''}, a thicker wall changed the fall time by ×${e.meanRatio.toFixed(2)} on average. The magnet fell ${e.direction === 'slower' ? 'more slowly' : e.direction === 'faster' ? 'faster' : 'about the same'}.`
        : '**Your experiment:** you haven’t compared wall thicknesses fairly yet. Change only the thickness and keep material and bore fixed.',
      actions: ['var-wall'],
    };
  }
  if (/diameter|wide|wider|bore|radius|व्यास|चौड़/.test(q)) {
    const e = effectOf(runs, 'innerDiameterMm');
    return {
      text: e
        ? `**From your experiment:** a wider bore changed the fall time by ×${e.meanRatio.toFixed(2)} across ${e.pairs} fair pair${e.pairs > 1 ? 's' : ''}. The magnet fell ${e.direction === 'faster' ? 'faster' : e.direction === 'slower' ? 'more slowly' : 'about the same'}.`
        : '**Your experiment:** you haven’t compared diameters fairly yet. Try 14 mm vs 24 mm with everything else the same.',
      actions: ['var-diameter'],
    };
  }
  if (/\b(my|our)\b.*\b(result|run|experiment|time)|why did\b/.test(q) && runs.length) {
    const r = runs[runs.length - 1];
    return {
      text: `**Your last run (#${r.n}):** ${MATERIALS[r.params.material].name}, ${r.params.wallMm} mm wall, ${r.params.innerDiameterMm} mm bore, ×${r.params.magnetStrength} magnet, ${r.params.dropHeightM} m drop → **${r.summary.fallTime.toFixed(2)} s** (${r.summary.brakingLabel} braking).`,
      actions: ['results'],
    };
  }
  return null;
}
