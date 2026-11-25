/** Magneto: a friendly horseshoe-magnet robot. Idle bob is CSS (disabled under reduced motion). */
export function Mascot({ size = 40, thinking = false }: { size?: number; thinking?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={thinking ? '' : 'fq-float'}>
      <circle cx="32" cy="32" r="31" fill="#2B201A" stroke="#4D3B2F" strokeWidth="2" />
      {/* antenna field arcs */}
      <path d="M20 12c4-4 20-4 24 0" fill="none" stroke="#86CFC3" strokeWidth="2.5" strokeLinecap="round" opacity={thinking ? 1 : 0.7}>
        {thinking && <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" />}
      </path>
      {/* horseshoe body */}
      <path d="M16 20v14a16 16 0 0 0 32 0V20h-9v14a7 7 0 0 1-14 0V20z" fill="#9DBB8C" />
      <rect x="16" y="18" width="9" height="7" rx="1.5" fill="#E3D7C1" />
      <rect x="39" y="18" width="9" height="7" rx="1.5" fill="#E3D7C1" />
      <text x="20.5" y="24" fontSize="5.5" fontWeight="700" textAnchor="middle" fill="#16100D">N</text>
      <text x="43.5" y="24" fontSize="5.5" fontWeight="700" textAnchor="middle" fill="#16100D">S</text>
      {/* face */}
      <circle cx="27" cy="40" r="2.6" fill="#16100D" />
      <circle cx="37" cy="40" r="2.6" fill="#16100D" />
      <path d="M28 46q4 3 8 0" fill="none" stroke="#16100D" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
