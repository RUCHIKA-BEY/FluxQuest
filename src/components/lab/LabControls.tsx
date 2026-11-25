import { MATERIALS, MATERIAL_ORDER, type MaterialId } from '../../lib/materials';
import { PARAM_LIMITS, validateParams, type ExperimentParams, type NumericParam } from '../../lib/physics';
import { useLab, type CameraPreset } from '../../store/lab';
import { Segmented, Slider, Toggle } from '../ui/Controls';
import { Icon } from '../ui/Icon';

export const fmtParam: Record<NumericParam, (v: number) => string> = {
  wallMm: (v) => v.toFixed(1),
  innerDiameterMm: (v) => v.toFixed(0),
  magnetStrength: (v) => v.toFixed(2),
  dropHeightM: (v) => v.toFixed(1),
};

export function MaterialPicker({ value, onChange, disabled, locked }: { value: MaterialId; onChange: (m: MaterialId) => void; disabled?: boolean; locked?: boolean }) {
  return (
    <Segmented<MaterialId>
      label={locked ? 'Tube material (held constant)' : 'Tube material'}
      value={value}
      disabled={disabled || locked}
      onChange={onChange}
      options={MATERIAL_ORDER.map((m) => ({
        value: m,
        ariaLabel: MATERIALS[m].name,
        label: (
          <span className="flex items-center justify-center gap-1.5">
            <span className="hidden rounded bg-ink/20 px-1 font-mono text-[10px] sm:inline" aria-hidden>
              {MATERIALS[m].symbol}
            </span>
            {MATERIALS[m].name.split(' ')[0]}
          </span>
        ),
      }))}
    />
  );
}

export function ParamSliders({ params, onChange, lockedExcept, disabled }: { params: ExperimentParams; onChange: (k: NumericParam, v: number) => void; lockedExcept?: NumericParam | 'material' | null; disabled?: boolean }) {
  const keys = Object.keys(PARAM_LIMITS) as NumericParam[];
  return (
    <div className="space-y-2">
      {keys.map((k) => {
        const lim = PARAM_LIMITS[k];
        return (
          <Slider
            key={k}
            label={lim.label}
            value={params[k]}
            min={lim.min}
            max={lim.max}
            step={lim.step}
            unit={lim.unit}
            format={fmtParam[k]}
            disabled={disabled}
            locked={lockedExcept !== undefined && lockedExcept !== null && lockedExcept !== k}
            onChange={(v) => onChange(k, v)}
            hint={k === 'innerDiameterMm' ? 'The magnet is 12 mm wide, so the bore must be wider.' : k === 'magnetStrength' ? 'Same size and mass; only magnetisation changes.' : undefined}
          />
        );
      })}
    </div>
  );
}

export function LabControls({ disabled }: { disabled?: boolean }) {
  const { params, setParam } = useLab();
  const issues = validateParams(params);
  return (
    <div className="space-y-4">
      <MaterialPicker value={params.material} onChange={(m) => setParam('material', m)} disabled={disabled} />
      <p className="-mt-2 text-xs text-oat-400">{MATERIALS[params.material].blurb}</p>
      <ParamSliders params={params} disabled={disabled} onChange={(k, v) => setParam(k, v)} />
      {issues.length > 0 && (
        <p role="alert" className="flex gap-2 rounded-lg border border-warn/60 bg-warn/10 p-3 text-sm text-warn">
          <Icon name="info" size={18} /> {issues[0]}
        </p>
      )}
    </div>
  );
}

export function VisualToggles() {
  const { showField, showEddy, showForces, xray, setView } = useLab();
  return (
    <div className="divide-y divide-espresso-700">
      <Toggle
        label="X-Ray mode"
        description="See-through tube, slow motion, inspect on pause."
        checked={xray}
        icon={<Icon name="xray" size={16} className="text-sage-300" />}
        onChange={(v) => setView({ xray: v, camera: v ? 'xray' : 'side', showEddy: v ? true : showEddy, showField: v ? true : showField })}
      />
      <Toggle label="Magnetic field lines" description="Eucalyptus lines with arrows (N → S)." checked={showField} onChange={(v) => setView({ showField: v })} icon={<span className="h-0.5 w-4 bg-field" aria-hidden />} />
      <Toggle label="Eddy currents" description="Amber loops with ⊙ / ⊗ direction marks." checked={showEddy} onChange={(v) => setView({ showEddy: v })} icon={<span className="h-0.5 w-4 border-t-2 border-dashed border-eddy" aria-hidden />} />
      <Toggle label="Force arrows" description="Weight (down) and magnetic braking (up)." checked={showForces} onChange={(v) => setView({ showForces: v })} icon={<Icon name="arrowDown" size={16} className="text-oat-200" />} />
    </div>
  );
}

export function CameraPresets({ onReset }: { onReset: () => void }) {
  const { camera, setView } = useLab();
  const presets: { id: CameraPreset; label: string; key: string }[] = [
    { id: 'side', label: 'Side', key: '1' },
    { id: 'top', label: 'Top', key: '2' },
    { id: 'close', label: 'Close-up', key: '3' },
    { id: 'xray', label: 'X-ray', key: '4' },
  ];
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex-1">
        <Segmented<CameraPreset>
          label="Camera view"
          size="sm"
          value={camera}
          onChange={(c) => setView({ camera: c, xray: c === 'xray' ? true : c === 'side' || c === 'top' ? false : useLab.getState().xray })}
          options={presets.map((p) => ({ value: p.id, label: p.label, ariaLabel: `${p.label} view (key ${p.key})` }))}
        />
      </div>
      <button type="button" onClick={onReset} className="fq-control min-h-[40px] rounded-lg border border-espresso-600 px-3 text-xs font-semibold text-oat-200 hover:text-oat-50">
        Reset view <span className="fq-kbd ml-1">R</span>
      </button>
    </div>
  );
}
