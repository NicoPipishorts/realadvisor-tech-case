import type { TrendPoint } from './types';

const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });

type DashboardViewsPanelProps = {
  loading: boolean;
  trend: TrendPoint[];
  selectedDate: string | null;
  windowLabel: string;
  offsetDays: number;
  onOlder: () => void;
  onNewer: () => void;
  onSelectDate: (date: string) => void;
};

export const DashboardViewsPanel = ({
  loading,
  trend,
  selectedDate,
  windowLabel,
  offsetDays,
  onOlder,
  onNewer,
  onSelectDate
}: DashboardViewsPanelProps) => {
  const topViews = Math.max(...trend.map((point) => point.views), 1);

  return (
    <section className="rounded-[2rem] border border-ink/10 bg-white/75 p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-ink">Views over time</h3>
          <p className="mt-1 text-sm text-ink/55">
            Daily listing views across your portfolio. Click any bar to inspect which properties
            were viewed that day.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/65 transition hover:bg-white"
            type="button"
            onClick={onOlder}
          >
            Older
          </button>
          <button
            className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/65 transition hover:bg-white disabled:opacity-50"
            disabled={offsetDays === 0}
            type="button"
            onClick={onNewer}
          >
            Newer
          </button>
        </div>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">
        {windowLabel}
      </p>
      <div className="relative mt-6 rounded-[1.5rem] border border-ink/10 bg-sand/40 p-5">
        {loading ? (
          <div className="flex h-72 items-center justify-center text-sm text-ink/50">
            Loading trend...
          </div>
        ) : trend.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-ink/50">
            No view data yet.
          </div>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-x-5 top-5 bottom-[4.75rem] grid grid-rows-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="border-t border-dashed border-ink/10" />
              ))}
            </div>
            <div className="relative pb-1">
              <div
                className="grid min-h-[21rem] w-full items-end gap-2 sm:gap-3"
                style={{
                  gridTemplateColumns: `repeat(${trend.length}, minmax(0, 1fr))`
                }}
              >
                {trend.map((point) => {
                  const isSelected = selectedDate === point.date;

                  return (
                    <button
                      key={point.date}
                      className={[
                        'group flex h-full flex-col justify-end gap-2 rounded-[1.25rem] px-1 py-3 text-center transition sm:px-2',
                        isSelected
                          ? 'bg-white shadow-sm ring-1 ring-pine/10'
                          : 'hover:bg-white/80 hover:shadow-sm hover:ring-1 hover:ring-ink/10'
                      ].join(' ')}
                      type="button"
                      onClick={() => onSelectDate(point.date)}
                    >
                      <span className="text-xs font-semibold text-ink/60">{point.views}</span>
                      <div className="flex flex-1 items-end rounded-[1.1rem] bg-white/80 px-1 pt-4 sm:px-2">
                        <div
                          className={[
                            'w-full rounded-t-[1rem] transition-all duration-150',
                            isSelected ? 'bg-pine' : 'bg-pine/80 group-hover:bg-pine'
                          ].join(' ')}
                          style={{
                            height: `${Math.max((point.views / topViews) * 100, point.views ? 12 : 4)}%`
                          }}
                        />
                      </div>
                      <span className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-ink/45">
                        {formatShortDate(point.date)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
