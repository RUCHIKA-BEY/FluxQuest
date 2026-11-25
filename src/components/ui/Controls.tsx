import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from './Icon';

/** Accessible range slider with label, live value, unit and an optional locked state. */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  disabled,
  locked,
  format = (v) => String(v),
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  disabled?: boolean;
  locked?: boolean;
  format?: (v: number) => string;
  hint?: ReactNode;
}) {
  const id = useId();
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className={locked ? 'opacity-70' : ''}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-semibold text-oat-100">
          {locked && <Icon name="lock" size={14} aria-hidden />}
          {label}
          {locked && <span className="sr-only">(held constant)</span>}
        </label>
        <output htmlFor={id} className="tabular rounded-md bg-espresso-700/70 px-2 py-0.5 text-sm font-semibold text-sage-200">
          {format(value)} {unit}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="fq-range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled || locked}
        aria-valuetext={`${format(value)} ${unit}`}
        style={{ ['--fill' as string]: `${fill}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="-mt-1 text-xs text-oat-400">{hint}</p>}
    </div>
  );
}

export function Toggle({ label, checked, onChange, description, icon }: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string; icon?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-3">
      <div className="min-w-0">
        <span id={id} className="flex items-center gap-2 text-sm font-semibold text-oat-100">
          {icon}
          {label}
        </span>
        {description && <span className="block text-xs text-oat-400">{description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        onClick={() => onChange(!checked)}
        className={`fq-control relative inline-flex h-8 w-[60px] shrink-0 items-center rounded-full border transition-colors ${
          checked ? 'border-sage-400 bg-sage-400' : 'border-espresso-600 bg-espresso-700'
        }`}
      >
        <span className={`absolute text-[10px] font-bold ${checked ? 'left-2 text-ink' : 'right-2 text-oat-300'}`} aria-hidden>
          {checked ? 'ON' : 'OFF'}
        </span>
        <span
          className={`inline-block h-6 w-6 rounded-full bg-oat-50 shadow transition-transform duration-200 ease-[var(--ease-lab)] ${checked ? 'translate-x-[30px]' : 'translate-x-[3px]'}`}
        />
      </button>
    </div>
  );
}

/** Radio-group semantics with roving tabindex and arrow-key navigation. */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled,
  size = 'md',
  hideLabel,
}: {
  label: string;
  options: { value: T; label: ReactNode; ariaLabel?: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  hideLabel?: boolean;
}) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const onKey = (e: KeyboardEvent) => {
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % options.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + options.length) % options.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = options.length - 1;
    else return;
    e.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div>
      <span id={id} className={hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-semibold text-oat-100'}>
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={id} aria-disabled={disabled} className="flex flex-wrap gap-1.5 rounded-xl bg-espresso-900/70 p-1" onKeyDown={onKey}>
        {options.map((o, i) => {
          const on = o.value === value;
          return (
            <button
              key={String(o.value)}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={o.ariaLabel}
              tabIndex={on ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(o.value)}
              className={`fq-control flex-1 rounded-lg font-semibold transition-colors ${size === 'sm' ? 'min-h-[40px] px-2.5 text-xs' : 'min-h-[44px] px-3 text-sm'} ${
                on ? 'bg-sage-400 text-ink shadow' : 'text-oat-200 hover:bg-oat-50/6 hover:text-oat-50'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
