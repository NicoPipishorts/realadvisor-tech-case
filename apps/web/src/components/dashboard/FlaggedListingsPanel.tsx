import { Link } from 'react-router-dom';

import { AlertIcon } from '../icons/AlertIcon';
import { EyeIcon } from '../icons/EyeIcon';
import type { FlaggedListing } from './types';

type FlaggedListingsPanelProps = {
  loading: boolean;
  flags: FlaggedListing[];
  isReviewing: boolean;
  onAction: (type: 'dismiss' | 'confirm', flagId: string) => void;
};

export const FlaggedListingsPanel = ({
  loading,
  flags,
  isReviewing,
  onAction
}: FlaggedListingsPanelProps) => (
  <section className="rounded-[2rem] border border-ink/10 bg-white/75 p-6 shadow-sm">
    <h3 className="text-lg font-semibold text-ink">Flagged listings</h3>
    <div className="mt-6 space-y-3">
      {loading ? (
        <div className="flex h-72 items-center justify-center rounded-[1.5rem] border border-dashed border-ink/15 bg-sand/60 text-sm text-ink/50">
          Loading review queue...
        </div>
      ) : flags.length ? (
        flags.map((flag) => (
          <article
            key={flag.id}
            className="rounded-[1.5rem] border border-ink/10 bg-sand/40 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold text-ink">{flag.property.title}</h4>
                <p className="mt-1 text-sm text-ink/65">{flag.primaryReason}</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
                <AlertIcon />
                {flag.confidenceScore}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-ink/45">
              <span>{flag.triggeredRule.replaceAll('_', ' ')}</span>
              <span>{flag.property.viewCount} views</span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Link
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 text-ink/60 transition hover:bg-white"
                title="View listing details"
                to={`/properties/${flag.property.id}`}
              >
                <EyeIcon />
              </Link>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  className="rounded-full border border-ink/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/70 transition hover:bg-white disabled:opacity-60"
                  disabled={isReviewing}
                  type="button"
                  onClick={() => onAction('dismiss', flag.id)}
                >
                  Dismiss
                </button>
                <button
                  className="rounded-full bg-ink px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-pine disabled:opacity-60"
                  disabled={isReviewing}
                  type="button"
                  onClick={() => onAction('confirm', flag.id)}
                >
                  Confirm scam
                </button>
              </div>
            </div>
          </article>
        ))
      ) : (
        <div className="flex h-72 items-center justify-center rounded-[1.5rem] border border-dashed border-ink/15 bg-sand/60 text-sm text-ink/50">
          No open flags.
        </div>
      )}
    </div>
  </section>
);
