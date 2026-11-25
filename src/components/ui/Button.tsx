import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'amber';
type Size = 'sm' | 'md' | 'lg';

const base =
  'fq-control inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold select-none whitespace-nowrap ' +
  'transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-[var(--ease-lab)] ' +
  'active:scale-[0.97] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 ';

const variants: Record<Variant, string> = {
  primary: 'bg-sage-400 text-ink hover:bg-sage-300 hover:-translate-y-px shadow-[0_8px_24px_-12px_rgb(157_187_140/.8)]',
  secondary: 'border border-oat-400/50 text-oat-50 hover:border-oat-200 hover:bg-oat-50/5',
  ghost: 'text-oat-200 hover:text-oat-50 hover:bg-oat-50/8',
  danger: 'border border-warn/70 text-warn hover:bg-warn/10',
  amber: 'bg-eddy text-ink hover:brightness-110 hover:-translate-y-px',
};
const sizes: Record<Size, string> = {
  sm: 'min-h-[40px] px-3 text-sm',
  md: 'min-h-[44px] px-4 text-[0.95rem]',
  lg: 'min-h-[52px] px-6 text-base',
};

interface Common {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, Common & ButtonHTMLAttributes<HTMLButtonElement>>(function Button(
  { variant = 'secondary', size = 'md', icon, iconRight, className = '', children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 16 : 18} />}
    </button>
  );
});

export function LinkButton({ variant = 'secondary', size = 'md', icon, iconRight, className = '', children, ...rest }: Common & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={18} />}
      {children}
      {iconRight && <Icon name={iconRight} size={18} />}
    </a>
  );
}

export function IconButton({ icon, label, className = '', active, ...rest }: { icon: IconName; label: string; active?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`fq-control inline-flex h-11 w-11 items-center justify-center rounded-[10px] border transition active:scale-95 ${
        active ? 'border-sage-400 bg-sage-400/15 text-sage-200' : 'border-espresso-600 text-oat-200 hover:border-oat-400 hover:text-oat-50'
      } ${className}`}
      {...rest}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}
