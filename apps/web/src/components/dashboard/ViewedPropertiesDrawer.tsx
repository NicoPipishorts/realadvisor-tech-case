import type { DailyViewedProperty } from './types';

const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });

type ViewedPropertiesDrawerProps = {
  selectedDate: string | null;
  loading: boolean;
  properties: DailyViewedProperty[];
  onClose: () => void;
  onOpenProperty: (propertyId: string) => void;
};

export const ViewedPropertiesDrawer = ({
  selectedDate,
  loading,
  properties,
  onClose,
  onOpenProperty
}: ViewedPropertiesDrawerProps) => {
  if (!selectedDate) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40">
      <button
        aria-label="Close viewed-properties panel"
        className="absolute inset-0 bg-ink/20"
        type="button"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md border-l border-ink/10 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold">
              Daily View Detail
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              {formatShortDate(selectedDate)}
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              Properties that received tracked views on this day.
            </p>
          </div>
          <button
            className="rounded-full border border-ink/10 px-3 py-2 text-sm font-semibold text-ink/60 transition hover:bg-sand"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-3 overflow-y-auto pb-8">
          {loading ? (
            <div className="rounded-[1.5rem] border border-dashed border-ink/15 px-4 py-12 text-center text-sm text-ink/50">
              Loading viewed properties...
            </div>
          ) : properties.length ? (
            properties.map((property) => (
              <button
                key={property.id}
                className="w-full rounded-[1.5rem] border border-ink/10 bg-sand/35 p-4 text-left transition hover:bg-sand/60"
                type="button"
                onClick={() => onOpenProperty(property.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-semibold text-ink">{property.title}</h4>
                  <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">
                    {property.viewCount}
                  </span>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ink/45">
                  {property.status.toLowerCase()}
                </p>
              </button>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-ink/15 px-4 py-12 text-center text-sm text-ink/50">
              No properties were viewed on this day.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
