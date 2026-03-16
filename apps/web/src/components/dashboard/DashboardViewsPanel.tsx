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
      <div className="mt-6 space-y-3 rounded-[1.5rem] border border-ink/10 bg-sand/40 p-4">
        {loading ? (
          <div className="flex h-72 items-center justify-center text-sm text-ink/50">
            Loading trend...
          </div>
        ) : trend.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-ink/50">
            No view data yet.
          </div>
        ) : (
          trend.map((point) => {
            const isSelected = selectedDate === point.date;

            return (
              <button
                key={point.date}
                className={[
                  'group grid w-full grid-cols-[4rem_1fr_2rem] items-center gap-3 rounded-xl px-3 py-2 text-left transition',
                  isSelected
                    ? 'bg-white shadow-sm ring-1 ring-pine/10'
                    : 'hover:bg-white/80 hover:shadow-sm hover:ring-1 hover:ring-ink/10'
                ].join(' ')}
                type="button"
                onClick={() => onSelectDate(point.date)}
              >
                <span className="text-xs font-medium text-ink/55">{formatShortDate(point.date)}</span>
                <div className="h-3 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-pine transition-all duration-150 group-hover:bg-pine"
                    style={{
                      width: `${Math.max((point.views / topViews) * 100, point.views ? 8 : 0)}%`
                    }}
                  />
                </div>
                <span className="text-right text-xs font-semibold text-ink/60">{point.views}</span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
};
