import type { ReactNode } from 'react';

import { AlertIcon } from '../icons/AlertIcon';

type ListingReviewFlag = {
  status: string;
  confidenceScore: number;
  primaryReason: string;
  triggeredRule: string;
  reviewReason?: string | null;
};

type ListingReviewCardProps = {
  flag: ListingReviewFlag;
  description: string;
  actions?: ReactNode;
};

export const ListingReviewCard = ({
  flag,
  description,
  actions
}: ListingReviewCardProps) => (
  <section className="rounded-[2rem] border border-amber-200 bg-white/80 p-6 shadow-sm">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
          <AlertIcon />
          <span>Listing Review</span>
        </div>
        <h3 className="mt-2 text-xl font-semibold text-ink">{flag.primaryReason}</h3>
        <p className="mt-3 text-sm leading-6 text-ink/65">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
          {flag.status.toLowerCase()}
        </span>
        <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">
          {flag.triggeredRule.replaceAll('_', ' ')}
        </span>
        <span className="rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink/70">
          Score {flag.confidenceScore}
        </span>
      </div>
    </div>

    {flag.reviewReason ? (
      <div className="mt-4 rounded-[1.5rem] border border-ink/10 bg-sand/35 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
          Review note
        </p>
        <p className="mt-2 text-sm text-ink/65">{flag.reviewReason}</p>
      </div>
    ) : null}

    {actions ? <div className="mt-5">{actions}</div> : null}
  </section>
);
