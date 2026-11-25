export type MaterialId = 'plastic' | 'aluminium' | 'copper' | 'brass';

export interface TubeMaterial {
  id: MaterialId;
  name: string;
  nameHi: string;
  /** Electrical conductivity in S/m (room temperature, typical values). */
  conductivity: number;
  conductive: boolean;
  /** Visual properties for the 3D tube. */
  color: string;
  metalness: number;
  roughness: number;
  /** Chart colour (validated categorical slot for the dark surface). */
  chartColor: string;
  /** Short symbol used in tables and charts so colour is never the only cue. */
  symbol: string;
  blurb: string;
}

export const MATERIALS: Record<MaterialId, TubeMaterial> = {
  plastic: {
    id: 'plastic',
    chartColor: '#9085E9',
    name: 'Plastic (PVC/acrylic)',
    nameHi: 'प्लास्टिक',
    conductivity: 0,
    conductive: false,
    color: '#D8E6E2',
    metalness: 0,
    roughness: 0.15,
    symbol: 'PL',
    blurb: 'An electrical insulator. Charges cannot flow, so no eddy currents form.',
  },
  aluminium: {
    id: 'aluminium',
    chartColor: '#3987E5',
    name: 'Aluminium',
    nameHi: 'एल्युमिनियम',
    conductivity: 3.5e7,
    conductive: true,
    color: '#C9CDD2',
    metalness: 0.85,
    roughness: 0.35,
    symbol: 'Al',
    blurb: 'A good conductor (about 60% of copper). Common tube alloys conduct a little less than pure aluminium.',
  },
  copper: {
    id: 'copper',
    chartColor: '#D95926',
    name: 'Copper',
    nameHi: 'तांबा',
    conductivity: 5.96e7,
    conductive: true,
    color: '#C8794B',
    metalness: 0.9,
    roughness: 0.3,
    symbol: 'Cu',
    blurb: 'One of the best everyday conductors, giving the strongest braking of these tubes.',
  },
  brass: {
    id: 'brass',
    chartColor: '#C98500',
    name: 'Brass',
    nameHi: 'पीतल',
    conductivity: 1.6e7,
    conductive: true,
    color: '#D2B055',
    metalness: 0.85,
    roughness: 0.35,
    symbol: 'Br',
    blurb: 'A copper–zinc alloy. It conducts, but only about a quarter as well as copper.',
  },
};

export const MATERIAL_ORDER: MaterialId[] = ['plastic', 'aluminium', 'copper', 'brass'];
