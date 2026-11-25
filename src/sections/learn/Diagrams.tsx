import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useMotionPref';

const MagnetSVG = ({ x, y, w = 36, h = 20 }: { x: number; y: number; w?: number; h?: number }) => (
  <g transform={`translate(${x - w / 2} ${y})`}>
    <rect width={w} height={h / 2} rx={3} fill="#E3D7C1" />
    <rect y={h / 2} width={w} height={h / 2} rx={3} fill="#9DBB8C" />
    <text x={w / 2} y={h / 2 - 2.5} textAnchor="middle" fontSize={8} fontWeight={700} fill="#16100D">S</text>
    <text x={w / 2} y={h - 2.5} textAnchor="middle" fontSize={8} fontWeight={700} fill="#16100D">N</text>
  </g>
);

/** Flux through a ring grows as the magnet approaches. */
export function FluxDiagram() {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 320 200" role="img" aria-labelledby="fd-t fd-d" className="w-full">
      <title id="fd-t">Magnetic flux through a ring</title>
      <desc id="fd-d">A magnet moves down towards a metal ring. As it gets closer, more field lines pass through the ring, so the magnetic flux increases.</desc>
      <motion.g animate={reduce ? undefined : { y: [0, 50, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
        <MagnetSVG x={160} y={20} />
        {[18, 34, 52].map((s) => (
          <path key={s} d={`M${160 - 6},40 C${160 - s - 10},${70 + s} ${160 - s},${90 + s} ${160 - 3},${100 + s * 1.2}`} fill="none" stroke="#86CFC3" strokeWidth={1.8} opacity={0.9} />
        ))}
        {[18, 34, 52].map((s) => (
          <path key={-s} d={`M${160 + 6},40 C${160 + s + 10},${70 + s} ${160 + s},${90 + s} ${160 + 3},${100 + s * 1.2}`} fill="none" stroke="#86CFC3" strokeWidth={1.8} opacity={0.9} />
        ))}
      </motion.g>
      <ellipse cx={160} cy={160} rx={46} ry={12} fill="none" stroke="#C8794B" strokeWidth={6} />
      <text x={220} y={180} fontSize={12} fill="#E3D7C1">metal ring</text>
      <text x={14} y={186} fontSize={11} fill="#BFAE93">Closer magnet → more lines through the ring → flux ↑</text>
    </svg>
  );
}

/** Swirling eddy currents in a metal wall near a moving magnet. */
export function EddyDiagram() {
  return (
    <svg viewBox="0 0 320 200" role="img" aria-labelledby="ed-t ed-d" className="w-full">
      <title id="ed-t">Eddy currents in a metal wall</title>
      <desc id="ed-d">A cut-away tube wall. Two loops of current swirl in opposite directions, one just above and one just below the falling magnet.</desc>
      <rect x={40} y={20} width={240} height={160} rx={10} fill="#C8794B22" stroke="#C8794B" strokeWidth={2} />
      <MagnetSVG x={160} y={90} />
      {[
        [60, 'counter'],
        [140, 'clock'],
      ].map(([cy, dir]) => (
        <g key={cy as number}>
          <ellipse cx={160} cy={cy as number} rx={70} ry={20} fill="none" stroke="#F0B062" strokeWidth={3.5} className="fq-current-flow" style={dir === 'clock' ? { animationDirection: 'reverse' } : undefined} />
          <text x={235} y={(cy as number) - 22} fontSize={11} fill="#F0B062">
            {dir === 'counter' ? '↺ above' : '↻ below'}
          </text>
        </g>
      ))}
      <text x={46} y={196} fontSize={11} fill="#BFAE93">Dashes move in the current’s direction. Opposite swirls above and below.</text>
    </svg>
  );
}

/** Lenz: the induced magnet repels from below and attracts from above. */
export function LenzDiagram() {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 320 220" role="img" aria-labelledby="ld-t ld-d" className="w-full">
      <title id="ld-t">Lenz’s law in the tube</title>
      <desc id="ld-d">
        The current loop below the magnet acts like a magnet with its north pole facing up, repelling the falling north pole. The loop above acts like a magnet with its north pole facing down,
        attracting the magnet’s south pole. Both forces point upward, opposing the fall.
      </desc>
      <MagnetSVG x={160} y={95} w={40} h={26} />
      <g>
        <rect x={135} y={160} width={50} height={12} rx={3} fill="#F0B06255" stroke="#F0B062" />
        <text x={160} y={169} textAnchor="middle" fontSize={8} fontWeight={700} fill="#F6F0E4">N ↑ induced</text>
        <rect x={135} y={44} width={50} height={12} rx={3} fill="#F0B06255" stroke="#F0B062" />
        <text x={160} y={53} textAnchor="middle" fontSize={8} fontWeight={700} fill="#F6F0E4">N ↓ induced</text>
      </g>
      <motion.g animate={reduce ? undefined : { y: [0, -4, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
        <path d="M230 150 L230 100 M222 110 L230 98 L238 110" stroke="#F0B062" strokeWidth={4} fill="none" />
        <text x={242} y={130} fontSize={11} fill="#F0B062">repel (push up)</text>
        <path d="M90 90 L90 40 M82 50 L90 38 L98 50" stroke="#F0B062" strokeWidth={4} fill="none" />
        <text x={8} y={74} fontSize={11} fill="#F0B062">attract (pull up)</text>
      </motion.g>
      <path d="M160 190 L160 210 M154 202 L160 212 L166 202" stroke="#F6F0E4" strokeWidth={3} fill="none" transform="translate(0 -70)" opacity={0.5} />
      <text x={170} y={140} fontSize={10} fill="#E3D7C1">falling</text>
    </svg>
  );
}

/** Where the energy goes: a simple flow diagram. */
export function EnergyDiagram({ heatShare = 0.95 }: { heatShare?: number }) {
  const h = 100;
  const heat = h * heatShare;
  return (
    <svg viewBox="0 0 320 170" role="img" aria-labelledby="en-t en-d" className="w-full">
      <title id="en-t">Energy flow</title>
      <desc id="en-d">Gravitational energy from the height splits into a small amount of kinetic energy and a large amount of heat in the tube wall, for a copper tube.</desc>
      <rect x={20} y={30} width={60} height={h} rx={6} fill="#BFAE93" opacity={0.6} />
      <text x={50} y={150} textAnchor="middle" fontSize={11} fill="#E3D7C1">height energy</text>
      <path d={`M80 30 C150 30 150 30 220 30 L220 ${30 + heat} C150 ${30 + heat} 150 ${30 + heat} 80 ${30 + heat} Z`} fill="#E86A4A" opacity={0.55} />
      <path d={`M80 ${30 + heat} C150 ${30 + heat} 150 ${40 + heat} 220 ${40 + heat} L220 ${40 + h} C150 ${40 + h} 150 ${30 + h} 80 ${30 + h} Z`} fill="#86CFC3" opacity={0.8} />
      <rect x={220} y={30} width={14} height={heat} fill="#E86A4A" />
      <rect x={220} y={40 + heat} width={14} height={h - heat} fill="#86CFC3" />
      <text x={242} y={30 + heat / 2} fontSize={11} fill="#F08A6C">heat in tube</text>
      <text x={242} y={52 + heat} fontSize={11} fill="#86CFC3">motion</text>
    </svg>
  );
}
