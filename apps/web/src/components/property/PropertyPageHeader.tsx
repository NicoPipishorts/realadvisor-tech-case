import type { ReactNode } from 'react';

type PropertyPageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  badges?: ReactNode;
  actions?: ReactNode;
};

export const PropertyPageHeader = ({
  eyebrow,
  title,
  description,
  badges,
  actions
}: PropertyPageHeaderProps) => (
  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div className="max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold">{eyebrow}</p>
      <h2 className="mt-2 text-4xl font-semibold tracking-tight text-ink">{title}</h2>
      {badges ? <div className="mt-4 flex flex-wrap items-center gap-2">{badges}</div> : null}
      {description ? <p className="mt-3 text-base leading-7 text-ink/70">{description}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-3 lg:justify-end">{actions}</div> : null}
  </div>
);
