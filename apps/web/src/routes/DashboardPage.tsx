import { gql, useQuery } from '@apollo/client';

const DASHBOARD_QUERY = gql`
  query DashboardPage {
    dashboardStats {
      totalActiveProperties
      totalViewsThisMonth
      propertiesSoldThisMonth
      averageDaysToSell
    }
    dashboardViewsOverTime(rangeDays: 30) {
      date
      views
    }
    topViewedProperties(limit: 5) {
      id
      title
      status
      viewCount
    }
    flaggedProperties(limit: 5) {
      id
      confidenceScore
      primaryReason
      triggeredRule
      property {
        id
        title
        viewCount
      }
    }
  }
`;

const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });

export const DashboardPage = () => {
  const { data, loading, error } = useQuery(DASHBOARD_QUERY);
  const stats = [
    { label: 'Active properties', value: data?.dashboardStats.totalActiveProperties ?? 0 },
    { label: 'Views this month', value: data?.dashboardStats.totalViewsThisMonth ?? 0 },
    { label: 'Sold this month', value: data?.dashboardStats.propertiesSoldThisMonth ?? 0 },
    { label: 'Avg. days to sell', value: data?.dashboardStats.averageDaysToSell ?? 0 }
  ];
  const trend = data?.dashboardViewsOverTime ?? [];
  const topViews = Math.max(...trend.map((point: { views: number }) => point.views), 1);

  return (
    <section className="space-y-8">
      <div className="max-w-3xl space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold">
          Overview
        </p>
        <h2 className="text-4xl font-semibold tracking-tight text-ink">
          Portfolio performance and listing trust in one place.
        </h2>
        <p className="text-base leading-7 text-ink/70">
          This scaffold wires the dashboard routes and presentation shell first. Data-backed cards,
          charts, and flagged listing actions will be connected in the next build steps.
        </p>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error.message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-3xl border border-ink/10 bg-white/80 p-5 shadow-sm"
          >
            <p className="text-sm text-ink/60">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold text-ink">
              {loading ? '...' : stat.value}
              {stat.label === 'Avg. days to sell' && !loading ? 'd' : ''}
            </p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-[2rem] border border-ink/10 bg-white/75 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-ink">Views over time</h3>
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
              trend.map((point: { date: string; views: number }) => (
                <div key={point.date} className="grid grid-cols-[4rem_1fr_2rem] items-center gap-3">
                  <span className="text-xs font-medium text-ink/55">
                    {formatShortDate(point.date)}
                  </span>
                  <div className="h-3 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-pine"
                      style={{ width: `${Math.max((point.views / topViews) * 100, point.views ? 8 : 0)}%` }}
                    />
                  </div>
                  <span className="text-right text-xs font-semibold text-ink/60">{point.views}</span>
                </div>
              ))
            )}
          </div>
        </section>
        <section className="rounded-[2rem] border border-ink/10 bg-white/75 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-ink">Flagged listings</h3>
          <div className="mt-6 space-y-3">
            {loading ? (
              <div className="flex h-72 items-center justify-center rounded-[1.5rem] border border-dashed border-ink/15 bg-sand/60 text-sm text-ink/50">
                Loading review queue...
              </div>
            ) : data?.flaggedProperties.length ? (
              data.flaggedProperties.map(
                (flag: {
                  id: string;
                  confidenceScore: number;
                  primaryReason: string;
                  triggeredRule: string;
                  property: { title: string; viewCount: number };
                }) => (
                  <article key={flag.id} className="rounded-[1.5rem] border border-ink/10 bg-sand/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-ink">{flag.property.title}</h4>
                        <p className="mt-1 text-sm text-ink/65">{flag.primaryReason}</p>
                      </div>
                      <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">
                        {flag.confidenceScore}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-ink/45">
                      <span>{flag.triggeredRule.replaceAll('_', ' ')}</span>
                      <span>{flag.property.viewCount} views</span>
                    </div>
                  </article>
                )
              )
            ) : (
              <div className="flex h-72 items-center justify-center rounded-[1.5rem] border border-dashed border-ink/15 bg-sand/60 text-sm text-ink/50">
                No open flags.
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] border border-ink/10 bg-white/75 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-ink">Top viewed properties</h3>
          <p className="text-sm text-ink/50">Last known ranking from all recorded views</p>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr>
                {['Property', 'Status', 'Views'].map((column) => (
                  <th
                    key={column}
                    className="px-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-ink/45"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={3}
                    className="rounded-2xl border border-dashed border-ink/15 px-4 py-12 text-center text-sm text-ink/50"
                  >
                    Loading top properties...
                  </td>
                </tr>
              ) : data?.topViewedProperties.length ? (
                data.topViewedProperties.map(
                  (property: { id: string; title: string; status: string; viewCount: number }) => (
                    <tr key={property.id} className="bg-sand/35">
                      <td className="rounded-l-2xl px-4 py-4 font-medium text-ink">{property.title}</td>
                      <td className="px-4 py-4 text-sm text-ink/60">{property.status.toLowerCase()}</td>
                      <td className="rounded-r-2xl px-4 py-4 text-sm font-semibold text-ink">
                        {property.viewCount}
                      </td>
                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="rounded-2xl border border-dashed border-ink/15 px-4 py-12 text-center text-sm text-ink/50"
                  >
                    No property views recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
};
