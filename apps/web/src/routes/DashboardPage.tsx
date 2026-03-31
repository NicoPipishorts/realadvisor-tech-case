import { gql, useMutation, useQuery } from '@apollo/client';
import { useMemo, useState } from 'react';

import { DashboardStatsGrid } from '../components/dashboard/DashboardStatsGrid';
import { DashboardViewsPanel } from '../components/dashboard/DashboardViewsPanel';
import { FlaggedListingsPanel } from '../components/dashboard/FlaggedListingsPanel';
import { TopViewedPropertiesTable } from '../components/dashboard/TopViewedPropertiesTable';
import { ViewedPropertiesDrawer } from '../components/dashboard/ViewedPropertiesDrawer';
import type {
  DailyViewedProperty,
  DashboardStatItem,
  FlaggedListing,
  TopViewedProperty,
  TrendPoint
} from '../components/dashboard/types';
import { ReviewActionModal } from '../components/review/ReviewActionModal';
import { useNavigate } from 'react-router-dom';

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
    topViewedProperties(limit: 9) {
      id
      title
      status
      viewCount
    }
    flaggedProperties(limit: 6) {
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

const formatWindowLabel = (dates: string[]) => {
  if (!dates.length) {
    return '';
  }

  const first = new Date(dates[0]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const last = new Date(dates[dates.length - 1]).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
  return `${first} - ${last}`;
};

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
  const stats: DashboardStatItem[] = [
    { label: 'Active properties', value: data?.dashboardStats.totalActiveProperties ?? 0 },
    { label: 'Views this month', value: data?.dashboardStats.totalViewsThisMonth ?? 0 },
    { label: 'Sold this month', value: data?.dashboardStats.propertiesSoldThisMonth ?? 0 },
    { label: 'Avg. days to sell', value: data?.dashboardStats.averageDaysToSell ?? 0 }
  ];
  const trend: TrendPoint[] = data?.dashboardViewsOverTime ?? [];
  const flaggedListings: FlaggedListing[] = data?.flaggedProperties ?? [];
  const topViewedProperties: TopViewedProperty[] = data?.topViewedProperties ?? [];
  const dailyViewedProperties: DailyViewedProperty[] =
    viewedPropertiesData?.dashboardViewedPropertiesByDate ?? [];
  const isReviewing = dismissing || confirming;
  const windowLabel = useMemo(
    () => formatWindowLabel(trend.map((point) => point.date)),
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

        <DashboardStatsGrid loading={loading} stats={stats} />

        <div className="space-y-6">
          <DashboardViewsPanel
            loading={loading}
            offsetDays={offsetDays}
            onNewer={() => {
              setOffsetDays((current) => Math.max(0, current - 14));
              setSelectedTrendDate(null);
            }}
            onOlder={() => {
              setOffsetDays((current) => current + 14);
              setSelectedTrendDate(null);
            }}
            onSelectDate={setSelectedTrendDate}
            selectedDate={selectedTrendDate}
            trend={trend}
            windowLabel={windowLabel}
          />

          <FlaggedListingsPanel
            flags={flaggedListings}
            isReviewing={isReviewing}
            loading={loading}
            onAction={(type, flagId) => {
              void handleFlagAction(type, flagId);
            }}
          />
        </div>

        <TopViewedPropertiesTable
          loading={loading}
          onOpen={(propertyId) => navigate(`/properties/${propertyId}`)}
          properties={topViewedProperties}
        />
      </section>

      <ViewedPropertiesDrawer
        loading={viewedPropertiesLoading}
        onClose={() => setSelectedTrendDate(null)}
        onOpenProperty={(propertyId) => {
          setSelectedTrendDate(null);
          navigate(`/properties/${propertyId}`);
        }}
        properties={dailyViewedProperties}
        selectedDate={selectedTrendDate}
      />

      {confirmingFlagId ? (
        <ReviewActionModal
          closeAriaLabel="Close confirm-scam modal"
          confirmLabel="Confirm scam"
          confirmPendingLabel="Confirming..."
          description="Confirming the scam marks this review as confirmed and moves the property into the archived state."
          heading="Archive this flagged listing?"
          isSubmitting={confirming}
          onChange={setConfirmReason}
          onClose={() => {
            setConfirmingFlagId(null);
            setConfirmReason('Confirmed as a scam and archived from the active portfolio.');
          }}
          onConfirm={() => void handleConfirmScam()}
          title="Confirm Scam"
          value={confirmReason}
        />
      ) : null}

      {dismissingFlagId ? (
        <ReviewActionModal
          closeAriaLabel="Close dismiss modal"
          confirmLabel="Dismiss flag"
          confirmPendingLabel="Dismissing..."
          description="Dismissing the flag marks this review as a false positive and removes it from the open flagged listings queue."
          heading="Remove this listing from the review queue?"
          isSubmitting={dismissing}
          onChange={setDismissReason}
          onClose={() => {
            setDismissingFlagId(null);
            setDismissReason('Reviewed manually and determined to be a false positive.');
          }}
          onConfirm={() => void handleDismissFlag()}
          title="Dismiss Flag"
          value={dismissReason}
        />
      ) : null}
    </>
  );
};
