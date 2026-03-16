import { gql, useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { PropertyPageHeader } from '../components/property/PropertyPageHeader';
import { PropertySummaryPanel } from '../components/property/PropertySummaryPanel';
import { PropertyViewHistorySection } from '../components/property/PropertyViewHistorySection';
import { ListingReviewCard } from '../components/review/ListingReviewCard';
import { ReviewActionModal } from '../components/review/ReviewActionModal';

const PROPERTY_DETAILS_QUERY = gql`
  query PropertyDetailsPage($id: ID!) {
    property(id: $id) {
      id
      title
      description
      addressLine1
      city
      postalCode
      country
      price
      surfaceSqm
      propertyType
      status
      createdAt
      viewCount
      isFlagged
      flag {
        id
        status
        confidenceScore
        primaryReason
        triggeredRule
        reviewReason
      }
      latestFlag {
        id
        status
        confidenceScore
        primaryReason
        triggeredRule
        reviewReason
      }
      viewHistory(limit: 20) {
        id
        viewerType
        visitorId
        viewedAt
      }
    }
  }
`;

const DELETE_PROPERTY_MUTATION = gql`
  mutation DeletePropertyFromDetails($id: ID!) {
    deleteProperty(id: $id)
  }
`;

const RESTORE_CONFIRMED_SCAM_MUTATION = gql`
  mutation RestoreConfirmedScam($flagId: ID!, $reason: String!) {
    restoreConfirmedScam(flagId: $flagId, reason: $reason)
  }
`;

export const PropertyDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [restoreReason, setRestoreReason] = useState(
    'Reopened after reviewing the scam confirmation.'
  );
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const { data, loading, error } = useQuery(PROPERTY_DETAILS_QUERY, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first'
  });
  const [deleteProperty, { loading: deleteLoading }] = useMutation(DELETE_PROPERTY_MUTATION, {
    refetchQueries: ['PropertiesPage', 'DashboardPage'],
    awaitRefetchQueries: true
  });
  const [restoreConfirmedScam, { loading: restoreLoading }] = useMutation(
    RESTORE_CONFIRMED_SCAM_MUTATION,
    {
      refetchQueries: ['PropertiesPage', 'DashboardPage', 'PropertyDetailsPage'],
      awaitRefetchQueries: true
    }
  );

  const handleDelete = async () => {
    if (!data?.property) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${data.property.title}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    await deleteProperty({
      variables: { id: data.property.id }
    });

    navigate('/properties');
  };

  const handleRestore = async () => {
    if (!data?.property.latestFlag?.id) {
      return;
    }

    if (!restoreReason.trim()) {
      return;
    }

    await restoreConfirmedScam({
      variables: {
        flagId: data.property.latestFlag.id,
        reason: restoreReason
      }
    });

    setIsRestoreModalOpen(false);
    setRestoreReason('Reopened after reviewing the scam confirmation.');
  };

  if (loading && !data?.property) {
    return (
      <section className="rounded-[2rem] border border-ink/10 bg-white/80 p-8 text-sm text-ink/55 shadow-sm">
        Loading property preview...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-sm text-red-700 shadow-sm">
        {error.message}
      </section>
    );
  }

  if (!data?.property) {
    return (
      <section className="rounded-[2rem] border border-ink/10 bg-white/80 p-8 text-sm text-ink/55 shadow-sm">
        Property not found.
      </section>
    );
  }

  const property = data.property;
  const latestFlag = property.latestFlag;
  const canRestoreConfirmedScam = latestFlag?.status === 'CONFIRMED';
  const displayFlag = property.flag ?? latestFlag;

  return (
    <section className="space-y-6">
      <PropertyPageHeader
        actions={
          <>
            <Link
              className="rounded-full border border-ink/10 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white"
              to="/properties"
            >
              Back
            </Link>
            <Link
              className="rounded-full border border-ink/10 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white"
              to={`/properties/${property.id}/edit`}
            >
              Edit
            </Link>
            <button
              className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              disabled={deleteLoading}
              type="button"
              onClick={() => void handleDelete()}
            >
              Delete
            </button>
            {canRestoreConfirmedScam ? (
              <button
                className="rounded-full border border-pine/20 bg-pine/10 px-5 py-3 text-sm font-semibold text-pine transition hover:bg-pine hover:text-white disabled:opacity-60"
                disabled={restoreLoading}
                type="button"
                onClick={() => setIsRestoreModalOpen(true)}
              >
                Remove scam confirmation
              </button>
            ) : null}
          </>
        }
        description={property.description}
        eyebrow="Property Preview"
        title={property.title}
      />

      {displayFlag ? (
        <ListingReviewCard
          description="This listing was flagged by the trust review workflow and may need manual attention."
          flag={displayFlag}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <PropertySummaryPanel
          addressLine1={property.addressLine1}
          city={property.city}
          country={property.country}
          createdAt={property.createdAt}
          postalCode={property.postalCode}
          price={property.price}
          propertyType={property.propertyType}
          status={property.status}
          surfaceSqm={property.surfaceSqm}
          viewCount={property.viewCount}
        />

        <aside className="space-y-6">
          <PropertyViewHistorySection
            compact
            emptyMessage="No tracked views yet."
            eyebrow="View History"
            title="Recent listing traffic"
            views={property.viewHistory}
          />
        </aside>
      </div>

      {isRestoreModalOpen ? (
        <ReviewActionModal
          closeAriaLabel="Close restore-listing modal"
          confirmLabel="Remove scam confirmation"
          confirmPendingLabel="Restoring..."
          description="Restoring this listing removes the confirmed-scam review state and brings the property back into the active workflow."
          heading="Reopen this archived listing?"
          isSubmitting={restoreLoading}
          onChange={setRestoreReason}
          onClose={() => {
            setIsRestoreModalOpen(false);
            setRestoreReason('Reopened after reviewing the scam confirmation.');
          }}
          onConfirm={() => void handleRestore()}
          title="Restore Listing"
          value={restoreReason}
        />
      ) : null}
    </section>
  );
};
