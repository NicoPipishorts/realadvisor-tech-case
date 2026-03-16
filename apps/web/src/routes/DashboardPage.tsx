import { gql, useMutation, useQuery } from '@apollo/client';
import { Link, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';

const DASHBOARD_QUERY = gql`
  query DashboardPage($offsetDays: Int!) {
    dashboardStats {
      totalActiveProperties
      totalViewsThisMonth
      propertiesSoldThisMonth
      averageDaysToSell
    }
    dashboardViewsOverTime(rangeDays: 14, offsetDays: $offsetDays) {
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

const VIEWED_PROPERTIES_BY_DATE_QUERY = gql`
  query DashboardViewedPropertiesByDate($date: String!) {
    dashboardViewedPropertiesByDate(date: $date) {
      id
      title
      status
      viewCount
    }
  }
`;

const DISMISS_FLAG_MUTATION = gql`
  mutation DismissFlag($flagId: ID!, $reason: String!) {
    dismissFlag(flagId: $flagId, reason: $reason)
  }
`;

const CONFIRM_SCAM_MUTATION = gql`
  mutation ConfirmScam($flagId: ID!, $reason: String!) {
    confirmScam(flagId: $flagId, reason: $reason)
  }
`;

const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });

const formatWindowLabel = (dates: string[]) => {
  if (!dates.length) {
    return '';
  }

  const first = formatShortDate(dates[0]);
  const last = formatShortDate(dates[dates.length - 1]);
  return `${first} - ${last}`;
};

const EyeIcon = () => (
  <svg
    aria-hidden="true"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const AlertIcon = () => (
  <svg
    aria-hidden="true"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 3.75 21 19.5H3L12 3.75Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
    <path
      d="M12 9v4.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
    <circle cx="12" cy="16.5" r="0.9" fill="currentColor" />
  </svg>
);

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [offsetDays, setOffsetDays] = useState(0);
  const [selectedTrendDate, setSelectedTrendDate] = useState<string | null>(null);
  const [dismissingFlagId, setDismissingFlagId] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState(
    'Reviewed manually and determined to be a false positive.'
  );
  const [confirmingFlagId, setConfirmingFlagId] = useState<string | null>(null);
  const [confirmReason, setConfirmReason] = useState(
    'Confirmed as a scam and archived from the active portfolio.'
  );
  const { data, loading, error } = useQuery(DASHBOARD_QUERY, {
    variables: {
      offsetDays
    },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true
  });
  const { data: viewedPropertiesData, loading: viewedPropertiesLoading } = useQuery(
    VIEWED_PROPERTIES_BY_DATE_QUERY,
    {
      variables: {
        date: selectedTrendDate
      },
      skip: !selectedTrendDate,
      fetchPolicy: 'cache-and-network',
      nextFetchPolicy: 'cache-first'
    }
  );
  const [dismissFlag, { loading: dismissing }] = useMutation(DISMISS_FLAG_MUTATION, {
    refetchQueries: ['DashboardPage', 'PropertiesPage'],
    awaitRefetchQueries: true
  });
  const [confirmScam, { loading: confirming }] = useMutation(CONFIRM_SCAM_MUTATION, {
    refetchQueries: ['DashboardPage', 'PropertiesPage'],
    awaitRefetchQueries: true
  });
  const stats = [
    { label: 'Active properties', value: data?.dashboardStats.totalActiveProperties ?? 0 },
    { label: 'Views this month', value: data?.dashboardStats.totalViewsThisMonth ?? 0 },
    { label: 'Sold this month', value: data?.dashboardStats.propertiesSoldThisMonth ?? 0 },
    { label: 'Avg. days to sell', value: data?.dashboardStats.averageDaysToSell ?? 0 }
  ];
  const trend = data?.dashboardViewsOverTime ?? [];
  const topViews = Math.max(...trend.map((point: { views: number }) => point.views), 1);
  const isReviewing = dismissing || confirming;
  const windowLabel = useMemo(
    () => formatWindowLabel(trend.map((point: { date: string }) => point.date)),
    [trend]
  );

  const handleFlagAction = async (type: 'dismiss' | 'confirm', flagId: string) => {
    if (type === 'confirm') {
      setConfirmingFlagId(flagId);
      return;
    }

    setDismissingFlagId(flagId);
  };

  const handleDismissFlag = async () => {
    if (!dismissingFlagId || !dismissReason.trim()) {
      return;
    }

    await dismissFlag({
      variables: {
        flagId: dismissingFlagId,
        reason: dismissReason
      }
    });

    setDismissingFlagId(null);
    setDismissReason('Reviewed manually and determined to be a false positive.');
  };

  const handleConfirmScam = async () => {
    if (!confirmingFlagId || !confirmReason.trim()) {
      return;
    }

    await confirmScam({
      variables: {
        flagId: confirmingFlagId,
        reason: confirmReason
      }
    });

    setConfirmingFlagId(null);
    setConfirmReason('Confirmed as a scam and archived from the active portfolio.');
  };

  return (
    <>
      <section className="space-y-8">
        <div className="max-w-3xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold">
            Overview
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-ink">
            Portfolio performance and listing trust in one place.
          </h2>
          <p className="text-base leading-7 text-ink/70">
            Live portfolio metrics, suspicious listing review, and view-volume tracking for the
            current agent.
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
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-ink">Views over time</h3>
                <p className="mt-1 text-sm text-ink/55">
                  Daily listing views across your portfolio. Click any bar to inspect which
                  properties were viewed that day.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/65 transition hover:bg-white"
                  type="button"
                  onClick={() => {
                    setOffsetDays((current) => current + 14);
                    setSelectedTrendDate(null);
                  }}
                >
                  Older
                </button>
                <button
                  className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/65 transition hover:bg-white disabled:opacity-50"
                  disabled={offsetDays === 0}
                  type="button"
                  onClick={() => {
                    setOffsetDays((current) => Math.max(0, current - 14));
                    setSelectedTrendDate(null);
                  }}
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
                trend.map((point: { date: string; views: number }) => {
                  const isSelected = selectedTrendDate === point.date;

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
                      onClick={() => setSelectedTrendDate(point.date)}
                    >
                      <span className="text-xs font-medium text-ink/55">
                        {formatShortDate(point.date)}
                      </span>
                      <div className="h-3 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-pine transition-all duration-150 group-hover:bg-pine"
                          style={{
                            width: `${Math.max((point.views / topViews) * 100, point.views ? 8 : 0)}%`
                          }}
                        />
                      </div>
                      <span className="text-right text-xs font-semibold text-ink/60">
                        {point.views}
                      </span>
                    </button>
                  );
                })
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
                    property: { title: string; viewCount: number; id: string };
                  }) => (
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
                            onClick={() => void handleFlagAction('dismiss', flag.id)}
                          >
                            Dismiss
                          </button>
                          <button
                            className="rounded-full bg-ink px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-pine disabled:opacity-60"
                            disabled={isReviewing}
                            type="button"
                            onClick={() => void handleFlagAction('confirm', flag.id)}
                          >
                            Confirm scam
                          </button>
                        </div>
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
            <p className="text-sm text-ink/50">All-time ranking across recorded property views</p>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr>
                  <th className="px-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-ink/45">
                    Property
                  </th>
                  <th className="px-4 text-center text-xs font-semibold uppercase tracking-[0.22em] text-ink/45">
                    Status
                  </th>
                  <th className="px-4 text-center text-xs font-semibold uppercase tracking-[0.22em] text-ink/45">
                    Views
                  </th>
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
                      <tr
                        key={property.id}
                        className="cursor-pointer bg-sand/35 transition hover:bg-sand/55"
                        onClick={() => navigate(`/properties/${property.id}`)}
                      >
                        <td className="rounded-l-2xl px-4 py-4 font-medium text-ink">
                          {property.title}
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-ink/60">
                          {property.status.toLowerCase()}
                        </td>
                        <td className="rounded-r-2xl px-4 py-4 text-center text-sm font-semibold text-ink">
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

      {selectedTrendDate ? (
        <div className="fixed inset-0 z-40">
          <button
            aria-label="Close viewed-properties panel"
            className="absolute inset-0 bg-ink/20"
            type="button"
            onClick={() => setSelectedTrendDate(null)}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md border-l border-ink/10 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold">
                  Daily View Detail
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  {formatShortDate(selectedTrendDate)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink/60">
                  Properties that received tracked views on this day.
                </p>
              </div>
              <button
                className="rounded-full border border-ink/10 px-3 py-2 text-sm font-semibold text-ink/60 transition hover:bg-sand"
                type="button"
                onClick={() => setSelectedTrendDate(null)}
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-3 overflow-y-auto pb-8">
              {viewedPropertiesLoading ? (
                <div className="rounded-[1.5rem] border border-dashed border-ink/15 px-4 py-12 text-center text-sm text-ink/50">
                  Loading viewed properties...
                </div>
              ) : viewedPropertiesData?.dashboardViewedPropertiesByDate.length ? (
                viewedPropertiesData.dashboardViewedPropertiesByDate.map(
                  (property: { id: string; title: string; status: string; viewCount: number }) => (
                    <button
                      key={property.id}
                      className="w-full rounded-[1.5rem] border border-ink/10 bg-sand/35 p-4 text-left transition hover:bg-sand/60"
                      type="button"
                      onClick={() => {
                        setSelectedTrendDate(null);
                        navigate(`/properties/${property.id}`);
                      }}
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
                  )
                )
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-ink/15 px-4 py-12 text-center text-sm text-ink/50">
                  No properties were viewed on this day.
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {confirmingFlagId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            aria-label="Close confirm-scam modal"
            className="absolute inset-0 bg-ink/30"
            type="button"
            onClick={() => {
              if (confirming) {
                return;
              }

              setConfirmingFlagId(null);
              setConfirmReason('Confirmed as a scam and archived from the active portfolio.');
            }}
          />
          <section className="relative w-full max-w-lg rounded-[2rem] border border-ink/10 bg-sand/95 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold">
                  Confirm Scam
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  Archive this flagged listing?
                </h3>
                <p className="mt-3 text-sm leading-6 text-ink/65">
                  Confirming the scam marks this review as confirmed and moves the property into
                  the archived state.
                </p>
              </div>
              <button
                className="rounded-full border border-ink/10 px-3 py-2 text-sm font-semibold text-ink/60 transition hover:bg-white disabled:opacity-50"
                disabled={confirming}
                type="button"
                onClick={() => {
                  setConfirmingFlagId(null);
                  setConfirmReason('Confirmed as a scam and archived from the active portfolio.');
                }}
              >
                Close
              </button>
            </div>

            <label className="mt-6 block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                Review reason
              </span>
              <textarea
                className="min-h-32 w-full rounded-[1.5rem] border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-pine"
                value={confirmReason}
                onChange={(event) => setConfirmReason(event.target.value)}
              />
            </label>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-full border border-ink/10 px-4 py-3 text-sm font-semibold text-ink/65 transition hover:bg-white disabled:opacity-50"
                disabled={confirming}
                type="button"
                onClick={() => {
                  setConfirmingFlagId(null);
                  setConfirmReason('Confirmed as a scam and archived from the active portfolio.');
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine disabled:opacity-50"
                disabled={confirming || !confirmReason.trim()}
                type="button"
                onClick={() => void handleConfirmScam()}
              >
                {confirming ? 'Confirming...' : 'Confirm scam'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {dismissingFlagId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            aria-label="Close dismiss modal"
            className="absolute inset-0 bg-ink/30"
            type="button"
            onClick={() => {
              if (dismissing) {
                return;
              }

              setDismissingFlagId(null);
              setDismissReason('Reviewed manually and determined to be a false positive.');
            }}
          />
          <section className="relative w-full max-w-lg rounded-[2rem] border border-ink/10 bg-sand/95 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold">
                  Dismiss Flag
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  Remove this listing from the review queue?
                </h3>
                <p className="mt-3 text-sm leading-6 text-ink/65">
                  Dismissing the flag marks this review as a false positive and removes it from the
                  open flagged listings queue.
                </p>
              </div>
              <button
                className="rounded-full border border-ink/10 px-3 py-2 text-sm font-semibold text-ink/60 transition hover:bg-white disabled:opacity-50"
                disabled={dismissing}
                type="button"
                onClick={() => {
                  setDismissingFlagId(null);
                  setDismissReason('Reviewed manually and determined to be a false positive.');
                }}
              >
                Close
              </button>
            </div>

            <label className="mt-6 block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                Review reason
              </span>
              <textarea
                className="min-h-32 w-full rounded-[1.5rem] border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-pine"
                value={dismissReason}
                onChange={(event) => setDismissReason(event.target.value)}
              />
            </label>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-full border border-ink/10 px-4 py-3 text-sm font-semibold text-ink/65 transition hover:bg-white disabled:opacity-50"
                disabled={dismissing}
                type="button"
                onClick={() => {
                  setDismissingFlagId(null);
                  setDismissReason('Reviewed manually and determined to be a false positive.');
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine disabled:opacity-50"
                disabled={dismissing || !dismissReason.trim()}
                type="button"
                onClick={() => void handleDismissFlag()}
              >
                {dismissing ? 'Dismissing...' : 'Dismiss flag'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
};
