import type React from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import { createContext, useContext, useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
type OrbitControlsImpl = React.ComponentRef<typeof OrbitControls>;
import { MATERIALS } from '../../lib/materials';
import { MAGNET, sampleAt, type ExperimentParams, type Sample, type Trajectory } from '../../lib/physics';
import type { CameraPreset } from '../../store/lab';

/** Visual radius exaggeration so a 16 mm tube is visible next to a 1 m drop. Lengths along the tube are true scale. */
export const VS = 5;
const BASE_Y = 0.1; // tube bottom above the table top
const COLORS = {
  field: '#86CFC3',
  eddy: '#F0B062',
  heat: '#E86A4A',
  north: '#9DBB8C',
  south: '#E3D7C1',
  weight: '#F6F0E4',
};

interface SceneProps {
  params: ExperimentParams;
  trajectory: Trajectory | null;
  getTime: () => number;
  showField: boolean;
  showEddy: boolean;
  showForces: boolean;
  xray: boolean;
  camera: CameraPreset;
  lowGraphics: boolean;
  reducedMotion: boolean;
  /** Bumped to request a camera reset. */
  resetToken?: number;
  autoRotate?: boolean;
  interactive?: boolean;
  onContextLost?: () => void;
}

interface Live {
  sample: Sample | null;
  magnetY: number;
}
const LiveCtx = createContext<MutableRefObject<Live> | null>(null);
const useLive = () => useContext(LiveCtx)!;

function geometryOf(p: ExperimentParams) {
  const aIn = (p.innerDiameterMm / 2000) * VS;
  const aOut = aIn + (p.wallMm / 1000) * VS;
  const magR = (MAGNET.diameterMm / 2000) * VS;
  const magL = (MAGNET.lengthMm / 1000) * VS;
  const L = p.dropHeightM;
  const top = BASE_Y + L;
  return { aIn, aOut, magR, magL, L, top };
}

function magnetCenterY(p: ExperimentParams, y: number) {
  const g = geometryOf(p);
  return g.top - g.magL / 2 - (Math.min(y, g.L) / g.L) * (g.L - g.magL);
}

/* ─────────────── Driver: computes the live sample once per frame ─────────────── */
function Driver({ params, trajectory, getTime, live }: { params: ExperimentParams; trajectory: Trajectory | null; getTime: () => number; live: MutableRefObject<Live> }) {
  const invalidate = useThree((s) => s.invalidate);
  useFrame(() => {
    const s = trajectory ? sampleAt(trajectory, getTime()) : null;
    live.current.sample = s;
    live.current.magnetY = magnetCenterY(params, s?.y ?? 0);
  }, -1);
  // keep rendering while time is moving
  useEffect(() => {
    let raf = 0;
    let last = -1;
    const loop = () => {
      const t = getTime();
      if (t !== last) {
        last = t;
        invalidate();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [getTime, invalidate]);
  return null;
}

/* ─────────────── Environment ─────────────── */
function Lab({ params, low }: { params: ExperimentParams; low: boolean }) {
  const g = geometryOf(params);
  const ticks = Math.round(g.L * 10);
  return (
    <group>
      {/* table */}
      <mesh position={[0, -0.03, 0]} receiveShadow={!low}>
        <boxGeometry args={[1.6, 0.06, 0.9]} />
        <meshStandardMaterial color="#5A4130" roughness={0.85} />
      </mesh>
      <mesh position={[0, -0.75, 0]}>
        <boxGeometry args={[1.5, 1.4, 0.8]} />
        <meshStandardMaterial color="#2B201A" roughness={1} />
      </mesh>
      {/* catch tray with foam */}
      <mesh position={[0, 0.02, 0]} receiveShadow={!low}>
        <cylinderGeometry args={[g.aOut + 0.07, g.aOut + 0.08, 0.04, 24]} />
        <meshStandardMaterial color="#4D3B2F" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.042, 0]}>
        <cylinderGeometry args={[g.aOut + 0.06, g.aOut + 0.06, 0.006, 24]} />
        <meshStandardMaterial color="#84A572" roughness={1} />
      </mesh>
      {/* stand rod + clamps */}
      <mesh position={[-0.22, g.top / 2, -0.05]}>
        <cylinderGeometry args={[0.008, 0.008, g.top + 0.15, 10]} />
        <meshStandardMaterial color="#8C8C8C" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[-0.22, 0.005, -0.05]}>
        <boxGeometry args={[0.18, 0.012, 0.14]} />
        <meshStandardMaterial color="#3A2C23" />
      </mesh>
      {[0.25, 0.75].map((f) => (
        <mesh key={f} position={[-0.11, BASE_Y + g.L * f, -0.025]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.02, 0.2, 0.02]} />
          <meshStandardMaterial color="#6B5646" />
        </mesh>
      ))}
      {/* ruler with 10 cm marks */}
      <group position={[g.aOut + 0.05, 0, 0]}>
        <mesh position={[0, BASE_Y + g.L / 2, 0]}>
          <boxGeometry args={[0.03, g.L, 0.004]} />
          <meshStandardMaterial color="#EDE4D3" roughness={0.8} />
        </mesh>
        {Array.from({ length: ticks + 1 }, (_, i) => (
          <mesh key={i} position={[-0.004, g.top - (i / ticks) * g.L, 0.003]}>
            <boxGeometry args={[i % 5 === 0 ? 0.024 : 0.014, 0.003, 0.002]} />
            <meshBasicMaterial color="#16100D" />
          </mesh>
        ))}
      </group>
      {/* start & finish sensor gates */}
      {[g.top + 0.01, BASE_Y - 0.005].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[g.aOut + 0.02, 0.004, 6, 32]} />
          <meshBasicMaterial color="#B5CDA8" />
        </mesh>
      ))}
    </group>
  );
}

/* ─────────────── Tube ─────────────── */
function Tube({ params, xray }: { params: ExperimentParams; xray: boolean }) {
  const g = geometryOf(params);
  const m = MATERIALS[params.material];
  // Without an environment map, very metallic surfaces render nearly black, so metalness is kept moderate.
  const opacity = xray ? 0.1 : m.conductive ? 0.62 : 0.22;
  const color = xray ? '#E3D7C1' : m.color;
  const mat = (side: THREE.Side) => (
    <meshStandardMaterial
      color={color}
      emissive={m.color}
      emissiveIntensity={xray ? 0.05 : m.conductive ? 0.12 : 0}
      metalness={xray ? 0 : Math.min(0.45, m.metalness)}
      roughness={xray ? 0.6 : 0.35}
      transparent
      opacity={opacity}
      depthWrite={false}
      side={side}
    />
  );
  return (
    <group position={[0, BASE_Y + g.L / 2, 0]}>
      <mesh renderOrder={2}>
        <cylinderGeometry args={[g.aOut, g.aOut, g.L, 40, 1, true]} />
        {mat(THREE.FrontSide)}
      </mesh>
      <mesh renderOrder={1}>
        <cylinderGeometry args={[g.aIn, g.aIn, g.L, 40, 1, true]} />
        {mat(THREE.BackSide)}
      </mesh>
      {[g.L / 2, -g.L / 2].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[g.aIn, g.aOut, 40]} />
          <meshStandardMaterial color={m.color} metalness={m.metalness} roughness={m.roughness} side={THREE.DoubleSide} transparent opacity={Math.min(1, opacity + 0.3)} />
        </mesh>
      ))}
    </group>
  );
}

/* ─────────────── Release gate (same start every time) ─────────────── */
function ReleaseGate({ params, getTime }: { params: ExperimentParams; getTime: () => number }) {
  const g = geometryOf(params);
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const target = getTime() > 0 ? -Math.PI / 2.2 : 0;
    ref.current.rotation.z += (target - ref.current.rotation.z) * 0.25;
  });
  return (
    <group position={[g.aOut, g.top - g.magL - 0.004, 0]}>
      <group ref={ref}>
        <mesh position={[-g.aOut, 0, 0]}>
          <boxGeometry args={[g.aOut * 2.1, 0.006, g.aIn * 1.4]} />
          <meshStandardMaterial color="#9DBB8C" />
        </mesh>
      </group>
      <mesh position={[0.012, 0, 0]}>
        <sphereGeometry args={[0.008, 10, 10]} />
        <meshStandardMaterial color="#F6F0E4" />
      </mesh>
    </group>
  );
}

/* ─────────────── Magnet ─────────────── */
function poleTexture(letter: string, bg: string) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#16100D';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 4; i++) ctx.fillText(letter, 32 + i * 64, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Magnet({ params }: { params: ExperimentParams }) {
  const g = geometryOf(params);
  const live = useLive();
  const ref = useRef<THREE.Group>(null);
  const [tn, ts] = useMemo(() => [poleTexture('N', COLORS.north), poleTexture('S', COLORS.south)], []);
  useEffect(() => () => {
    tn.dispose();
    ts.dispose();
  }, [tn, ts]);
  useFrame(() => {
    if (ref.current) ref.current.position.y = live.current.magnetY;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, g.magL / 4, 0]} castShadow>
        <cylinderGeometry args={[g.magR, g.magR, g.magL / 2, 32]} />
        <meshStandardMaterial map={ts} metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh position={[0, -g.magL / 4, 0]} castShadow>
        <cylinderGeometry args={[g.magR, g.magR, g.magL / 2, 32]} />
        <meshStandardMaterial map={tn} metalness={0.4} roughness={0.35} />
      </mesh>
    </group>
  );
}

/* ─────────────── Field lines: r = r0 sin²θ dipole loops ─────────────── */
function FieldLines({ params, low }: { params: ExperimentParams; low: boolean }) {
  const g = geometryOf(params);
  const live = useLive();
  const ref = useRef<THREE.Group>(null);
  const lines = useMemo(() => {
    const out: { pts: THREE.Vector3[]; eq: THREE.Vector3 }[] = [];
    const radii = low ? [g.magL * 2.2] : [g.magL * 1.6, g.magL * 3];
    const phis = low ? [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2] : [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    for (const r0 of radii)
      for (const phi of phis) {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 48; i++) {
          const th = 0.28 + (i / 48) * (Math.PI - 0.56);
          const r = r0 * Math.sin(th) ** 2;
          pts.push(new THREE.Vector3(r * Math.sin(th) * Math.cos(phi), r * Math.cos(th), r * Math.sin(th) * Math.sin(phi)));
        }
        out.push({ pts, eq: new THREE.Vector3(r0 * Math.cos(phi), 0, r0 * Math.sin(phi)) });
      }
    return out;
  }, [g.magL, low]);
  useFrame(() => {
    if (ref.current) ref.current.position.y = live.current.magnetY;
  });
  return (
    <group ref={ref}>
      {lines.map((l, i) => (
        <group key={i}>
          <Line points={l.pts} color={COLORS.field} lineWidth={low ? 1.5 : 2} transparent opacity={0.85} />
          {/* N is at the bottom, so outside the magnet the field runs upward (N → S) */}
          <mesh position={l.eq}>
            <coneGeometry args={[0.009, 0.024, 8]} />
            <meshBasicMaterial color={COLORS.field} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ─────────────── Eddy current rings ─────────────── */
function EddyRing({ params, offset, ccw, low }: { params: ExperimentParams; offset: number; ccw: boolean; low: boolean }) {
  const g = geometryOf(params);
  const live = useLive();
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const torusMat = useRef<THREE.MeshStandardMaterial>(null);
  const arrow = useRef<THREE.Group>(null);
  const rMid = (g.aIn + g.aOut) / 2;
  const n = low ? 4 : 6;
  useFrame((_, dt) => {
    const s = live.current.sample;
    const I = Math.min(1, s?.current ?? 0);
    if (group.current) {
      const y = live.current.magnetY + offset;
      group.current.position.y = y;
      group.current.visible = I > 0.01 && y > BASE_Y && y < g.top;
    }
    if (torusMat.current) {
      torusMat.current.emissiveIntensity = 0.3 + I * 2.2;
      torusMat.current.opacity = 0.25 + I * 0.7;
    }
    // seen from above (+y): counter-clockwise is a positive rotation about +y
    if (spin.current) spin.current.rotation.y += (ccw ? 1 : -1) * dt * (0.8 + I * 4);
    if (arrow.current) arrow.current.scale.setScalar(0.3 + I);
  });
  return (
    <group ref={group}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[rMid, Math.max(0.004, (g.aOut - g.aIn) / 2 + 0.002), 8, 48]} />
        <meshStandardMaterial ref={torusMat} color={COLORS.eddy} emissive={COLORS.eddy} transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <group ref={spin}>
        {Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2;
          // tangent direction for CCW (seen from above): (−sin a, 0, cos a) in x/z, but three's +y rotation maps x→−z
          return (
            <group key={i} position={[rMid * Math.cos(a), 0, -rMid * Math.sin(a)]} rotation={[0, a, 0]}>
              <mesh rotation={[ccw ? -Math.PI / 2 : Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.012, 0.03, 8]} />
                <meshBasicMaterial color="#FFE2B8" />
              </mesh>
            </group>
          );
        })}
      </group>
      {/* induced magnetic field on the axis: ring below points up (repels N), ring above points down (attracts S back) */}
      <group ref={arrow} rotation={[ccw ? 0 : Math.PI, 0, 0]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.04, 6]} />
          <meshBasicMaterial color={COLORS.eddy} />
        </mesh>
        <mesh position={[0, 0.048, 0]}>
          <coneGeometry args={[0.01, 0.018, 8]} />
          <meshBasicMaterial color={COLORS.eddy} />
        </mesh>
      </group>
    </group>
  );
}

/* ─────────────── Force arrows and heat ─────────────── */
function Arrow({ color, dir }: { color: string; dir: 1 | -1 }) {
  return (
    <group rotation={[dir === 1 ? 0 : Math.PI, 0, 0]}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 1, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <coneGeometry args={[0.18, 0.26, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function Forces({ params }: { params: ExperimentParams }) {
  const g = geometryOf(params);
  const live = useLive();
  const grp = useRef<THREE.Group>(null);
  const brake = useRef<THREE.Group>(null);
  const BASE = 0.14;
  useFrame(() => {
    if (grp.current) grp.current.position.y = live.current.magnetY;
    const s = live.current.sample;
    const ratio = s ? Math.min(1.3, s.fBrake / (MAGNET.massKg * 9.81)) : 0;
    if (brake.current) {
      brake.current.visible = ratio > 0.02;
      brake.current.scale.set(0.06, BASE * Math.max(0.02, ratio), 0.06);
    }
  });
  return (
    <group ref={grp}>
      <group position={[g.aOut + 0.11, 0, 0]} scale={[0.06, BASE, 0.06]}>
        <Arrow color={COLORS.weight} dir={-1} />
      </group>
      <group ref={brake} position={[-(g.aOut + 0.11), 0, 0]}>
        <Arrow color={COLORS.eddy} dir={1} />
      </group>
    </group>
  );
}

function HeatGlow({ params, xray }: { params: ExperimentParams; xray: boolean }) {
  const g = geometryOf(params);
  const live = useLive();
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    const I = Math.min(1, live.current.sample?.current ?? 0);
    if (ref.current) {
      ref.current.position.y = live.current.magnetY;
      ref.current.visible = I > 0.02;
    }
    if (mat.current) mat.current.opacity = (0.03 + I * I * 0.2) * (xray ? 0.5 : 1);
  });
  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[g.aOut + 0.004, g.aOut + 0.004, g.magL * 3.2, 32, 1, true]} />
      <meshBasicMaterial ref={mat} color={COLORS.heat} transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ─────────────── Camera rig with presets ─────────────── */
function CameraRig({ params, preset, resetToken, reducedMotion, autoRotate, interactive }: { params: ExperimentParams; preset: CameraPreset; resetToken?: number; reducedMotion: boolean; autoRotate?: boolean; interactive?: boolean }) {
  const g = geometryOf(params);
  const live = useLive();
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size, invalidate } = useThree();
  const tween = useRef<{ pos: THREE.Vector3; target: THREE.Vector3; t: number } | null>(null);

  const goal = () => {
    const cam = camera as THREE.PerspectiveCamera;
    const fovV = THREE.MathUtils.degToRad(cam.fov);
    const aspect = size.width / Math.max(1, size.height);
    const my = live.current.magnetY || g.top;
    switch (preset) {
      case 'top':
        return { pos: new THREE.Vector3(0.02, g.top + 0.45, 0.12), target: new THREE.Vector3(0, BASE_Y, 0) };
      case 'close':
        return { pos: new THREE.Vector3(0.22, my + 0.08, 0.38), target: new THREE.Vector3(0, my, 0) };
      case 'xray':
        return { pos: new THREE.Vector3(0.12, my + 0.04, 0.26), target: new THREE.Vector3(0, my, 0) };
      default: {
        const h = g.L + 0.35;
        let dist = h / 2 / Math.tan(fovV / 2);
        if (aspect < 0.6) dist *= 1.1;
        const cy = BASE_Y + g.L / 2;
        return { pos: new THREE.Vector3(dist * 0.3, cy + 0.08, dist * 0.95), target: new THREE.Vector3(0, cy, 0) };
      }
    }
  };

  useEffect(() => {
    const goalNow = goal();
    if (reducedMotion) {
      camera.position.copy(goalNow.pos);
      controls.current?.target.copy(goalNow.target);
      controls.current?.update();
      invalidate();
    } else {
      tween.current = { ...goalNow, t: 0 };
      invalidate(); // demand frameloop: kick off the first frame of the camera move
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, resetToken, g.L, size.width, size.height]);

  const lastMagnetY = useRef<number | null>(null);
  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    const tw = tween.current;
    if (tw) {
      tw.t = Math.min(1, tw.t + dt / 0.7);
      // frame-rate independent easing, snapping exactly to the goal at the end (works on slow phones)
      const a = tw.t >= 1 ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 9);
      camera.position.lerp(tw.pos, a);
      c.target.lerp(tw.target, a);
      if (tw.t >= 1) tween.current = null;
      c.update();
      invalidate();
    }
    // follow the magnet in close-up and X-ray presets: keep the user's orbit offset, lock height to the magnet
    const my = live.current.magnetY;
    if ((preset === 'close' || preset === 'xray') && !tw && Math.abs(c.target.y - my) > 1e-5) {
      const off = camera.position.y - c.target.y;
      c.target.y = my;
      camera.position.y = my + off;
      c.update();
    }
    lastMagnetY.current = my;
  });

  return (
    <OrbitControls
      ref={controls}
      enabled={interactive !== false}
      enableDamping={!reducedMotion}
      dampingFactor={0.12}
      minDistance={0.12}
      maxDistance={4}
      maxPolarAngle={Math.PI * 0.95}
      autoRotate={!!autoRotate && !reducedMotion}
      autoRotateSpeed={0.6}
      enablePan={interactive !== false}
    />
  );
}

/* ─────────────── Context loss guard ─────────────── */
function ContextGuard({ onLost }: { onLost?: () => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement;
    const h = (e: Event) => {
      e.preventDefault();
      onLost?.();
    };
    el.addEventListener('webglcontextlost', h);
    return () => el.removeEventListener('webglcontextlost', h);
  }, [gl, onLost]);
  return null;
}

export default function LabScene(props: SceneProps) {
  const { params, trajectory, getTime, showField, showEddy, showForces, xray, camera, lowGraphics, reducedMotion } = props;
  const live = useRef<Live>({ sample: null, magnetY: magnetCenterY(params, 0) });
  const conductive = MATERIALS[params.material].conductive;
  const g = geometryOf(params);
  return (
    <Canvas
      frameloop="demand"
      dpr={lowGraphics ? 1 : [1, 1.75]}
      shadows={!lowGraphics}
      gl={{ antialias: !lowGraphics, powerPreference: 'low-power', alpha: true }}
      camera={{ fov: 40, near: 0.01, far: 20, position: [0.5, 0.7, 2] }}
      style={{ touchAction: 'none' }}
    >
      <LiveCtx.Provider value={live}>
        <ContextGuard onLost={props.onContextLost} />
        <Driver params={params} trajectory={trajectory} getTime={getTime} live={live} />
        <color attach="background" args={['#1A130F']} />
        <fog attach="fog" args={['#1A130F', 3, 8]} />
        <hemisphereLight args={['#F6F0E4', '#2B201A', 0.9]} />
        <directionalLight position={[1.5, 2.5, 2]} intensity={1.6} castShadow={!lowGraphics} shadow-mapSize={[512, 512]} />
        <pointLight position={[-0.6, g.top, 0.6]} intensity={0.6} color="#B5CDA8" />
        <Lab params={params} low={lowGraphics} />
        <Tube params={params} xray={xray} />
        <ReleaseGate params={params} getTime={getTime} />
        <Magnet params={params} />
        {showField && <FieldLines params={params} low={lowGraphics} />}
        {showEddy && conductive && (
          <>
            <EddyRing params={params} offset={-g.magL * 1.1} ccw low={lowGraphics} />
            <EddyRing params={params} offset={g.magL * 1.1} ccw={false} low={lowGraphics} />
          </>
        )}
        {showForces && <Forces params={params} />}
        {conductive && <HeatGlow params={params} xray={xray} />}
        <CameraRig params={params} preset={camera} resetToken={props.resetToken} reducedMotion={reducedMotion} autoRotate={props.autoRotate} interactive={props.interactive} />
      </LiveCtx.Provider>
    </Canvas>
  );
}
