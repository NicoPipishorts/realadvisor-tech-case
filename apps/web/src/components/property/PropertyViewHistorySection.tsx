type PropertyViewEntry = {
  id: string;
  viewerType: string;
  visitorId: string | null;
  viewedAt: string;
};

type PropertyViewHistorySectionProps = {
  eyebrow: string;
  title: string;
  emptyMessage: string;
  views: PropertyViewEntry[];
  compact?: boolean;
};

const formatViewDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

export const PropertyViewHistorySection = ({
  eyebrow,
  title,
  emptyMessage,
  views,
  compact = false
}: PropertyViewHistorySectionProps) => (
  <section className="rounded-[2rem] border border-ink/10 bg-white/80 p-6 shadow-sm">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold">{eyebrow}</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{title}</h3>
      </div>
      <p className="text-sm text-ink/50">{views.length} recent tracked views</p>
    </div>

    <div className="mt-6 space-y-3">
      {views.length ? (
        views.map((view) => (
          <article
            key={view.id}
            className={[
              'rounded-[1.5rem] border border-ink/10 bg-sand/35',
              compact ? 'px-4 py-3' : 'flex items-center justify-between px-4 py-3'
            ].join(' ')}
          >
            <div>
              <p className="text-sm font-semibold text-ink">{view.viewerType.toLowerCase()}</p>
              <p className="mt-1 text-xs text-ink/50">
                {view.visitorId ? `Visitor: ${view.visitorId}` : 'No visitor id'}
              </p>
            </div>
            <p className={compact ? 'mt-2 text-sm text-ink/60' : 'text-sm text-ink/60'}>
              {formatViewDate(view.viewedAt)}
            </p>
          </article>
        ))
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-ink/15 px-4 py-12 text-center text-sm text-ink/50">
          {emptyMessage}
        </div>
      )}
    </div>
  </section>
);
