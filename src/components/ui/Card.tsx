import type { HTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`fq-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ icon, eyebrow, title, children, id }: { icon?: IconName; eyebrow?: string; title: ReactNode; children?: ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      {icon && (
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-400/12 text-sage-300">
          <Icon name={icon} size={20} />
        </span>
      )}
      <div className="min-w-0">
        {eyebrow && <p className="fq-eyebrow">{eyebrow}</p>}
        <h3 id={id} className="fq-h3 text-oat-50">
          {title}
        </h3>
        {children && <div className="mt-1 text-sm text-oat-300">{children}</div>}
      </div>
    </div>
  );
}

export function Badge({ tone = 'neutral', children, icon }: { tone?: 'neutral' | 'sage' | 'field' | 'current' | 'success' | 'warn'; children: ReactNode; icon?: IconName }) {
  const tones = {
    neutral: 'border-espresso-600 text-oat-200',
    sage: 'border-sage-400/50 text-sage-200 bg-sage-400/10',
    field: 'border-field/50 text-field bg-field/10',
    current: 'border-eddy/50 text-eddy bg-eddy/10',
    success: 'border-success/50 text-success bg-success/10',
    warn: 'border-warn/50 text-warn bg-warn/10',
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

export function SectionHeading({ eyebrow, title, children, id }: { eyebrow: string; title: ReactNode; children?: ReactNode; id?: string }) {
  return (
    <header className="mb-8 max-w-3xl">
      <p className="fq-eyebrow">{eyebrow}</p>
      <h1 id={id} className="fq-h2 mt-2 text-oat-50" tabIndex={-1}>
        {title}
      </h1>
      {children && <div className="mt-3 text-lg text-oat-200">{children}</div>}
    </header>
  );
}
