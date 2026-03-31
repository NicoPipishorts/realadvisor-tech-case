import type { TopViewedProperty } from './types';

type TopViewedPropertiesTableProps = {
  loading: boolean;
  properties: TopViewedProperty[];
  onOpen: (propertyId: string) => void;
};

export const TopViewedPropertiesTable = ({
  loading,
  properties,
  onOpen
}: TopViewedPropertiesTableProps) => (
  <section className="rounded-[2rem] border border-ink/10 bg-white/75 p-6 shadow-sm">
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 className="text-lg font-semibold text-ink">Top viewed properties</h3>
        <p className="mt-1 text-sm text-ink/50">
          Top 9 listings ranked by recorded lifetime views.
        </p>
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">
        All-time ranking
      </p>
    </div>
    <div className="mt-6">
      {loading ? (
        <div className="flex h-72 items-center justify-center rounded-[1.5rem] border border-dashed border-ink/15 bg-sand/60 text-sm text-ink/50">
          Loading top properties...
        </div>
      ) : properties.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property, index) => (
            <button
              key={property.id}
              className="flex h-full flex-col rounded-[1.5rem] border border-ink/10 bg-sand/35 p-4 text-left transition hover:bg-sand/55 hover:shadow-sm"
              type="button"
              onClick={() => onOpen(property.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">
                    Rank #{index + 1}
                  </p>
                  <h4 className="mt-2 text-base font-semibold text-ink">{property.title}</h4>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
                  {property.status.toLowerCase()}
                </span>
              </div>
              <div className="mt-auto pt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">
                  Lifetime views
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">
                  {property.viewCount}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex h-72 items-center justify-center rounded-[1.5rem] border border-dashed border-ink/15 bg-sand/60 text-sm text-ink/50">
          No property views recorded yet.
        </div>
      )}
    </div>
  </section>
);
