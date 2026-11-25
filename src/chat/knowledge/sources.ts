/**
 * Source registry for Magneto's knowledge base.
 * Every passage points to one of these. External references are real, verifiable publications; passage text is a
 * FluxQuest summary written for students, and the reference says where to verify the physics.
 * Project-authored material is labelled as such and is never presented as an external source.
 */
export type SourceKind = 'textbook' | 'journal' | 'project' | 'placeholder';

export interface Source {
  id: string;
  title: string;
  org: string;
  kind: SourceKind;
  url?: string;
  /** Free-text citation for references without a stable URL. */
  citation?: string;
  ingested: boolean;
  note?: string;
}

export const SOURCES: Record<string, Source> = {
  'openstax-up2': {
    id: 'openstax-up2',
    title: 'University Physics Volume 2, Chapter 13: Electromagnetic Induction',
    org: 'OpenStax (Rice University), CC BY 4.0',
    kind: 'textbook',
    url: 'https://openstax.org/books/university-physics-volume-2/pages/13-introduction',
    ingested: true,
    note: 'Sections on Faraday’s law, Lenz’s law, motional EMF, induced electric fields and eddy currents.',
  },
  'openstax-cp2': {
    id: 'openstax-cp2',
    title: 'College Physics 2e, Chapter 23: Electromagnetic Induction, AC Circuits, and Electrical Technologies',
    org: 'OpenStax (Rice University), CC BY 4.0',
    kind: 'textbook',
    url: 'https://openstax.org/books/college-physics-2e/pages/23-introduction-to-electromagnetic-induction-ac-circuits-and-electrical-technologies',
    ingested: true,
    note: 'Includes the section “Eddy Currents and Magnetic Damping”.',
  },
  levin2006: {
    id: 'levin2006',
    title: 'Electromagnetic braking: A simple quantitative model',
    org: 'Y. Levin, F. L. da Silveira, F. B. Rizzato',
    kind: 'journal',
    citation: 'American Journal of Physics 74, 815 (2006)',
    ingested: true,
    note: 'Point-dipole model of a magnet falling through a thin conducting pipe; source of the k ∝ σ w μ² / a⁴ result.',
  },
  maclatchy1993: {
    id: 'maclatchy1993',
    title: 'A quantitative magnetic braking experiment',
    org: 'C. S. MacLatchy, P. Backman, L. Bogan',
    kind: 'journal',
    citation: 'American Journal of Physics 61, 1096 (1993)',
    ingested: true,
    note: 'Classic laboratory study of a magnet falling through conducting tubes.',
  },
  'fq-problems': {
    id: 'fq-problems',
    title: 'FluxQuest problem statements P021–P023',
    org: 'FluxQuest project brief',
    kind: 'project',
    ingested: true,
  },
  'fq-model': {
    id: 'fq-model',
    title: 'FluxQuest simulation model notes',
    org: 'FluxQuest project team',
    kind: 'project',
    ingested: true,
    note: 'Describes the assumptions and calibration of this website’s simulation.',
  },
  'fq-protocol': {
    id: 'fq-protocol',
    title: 'FluxQuest experiment protocol, safety and facilitation notes',
    org: 'FluxQuest project team',
    kind: 'project',
    ingested: true,
  },
  'fq-glossary': {
    id: 'fq-glossary',
    title: 'FluxQuest glossary',
    org: 'FluxQuest project team',
    kind: 'project',
    ingested: true,
  },
  'agastya-manual': {
    id: 'agastya-manual',
    title: 'Agastya Lazy Tube model manual',
    org: 'Agastya International Foundation',
    kind: 'placeholder',
    ingested: false,
    note: 'NOT YET INGESTED. To add it: paste its sections as passages in passages.ts with sourceId "agastya-manual". Until then Magneto will not quote it.',
  },
};
