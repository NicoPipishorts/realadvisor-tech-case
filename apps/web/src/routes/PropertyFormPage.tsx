import { gql, useMutation, useQuery } from '@apollo/client';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { PropertyEditorForm } from '../components/property/PropertyEditorForm';
import { PropertyPageHeader } from '../components/property/PropertyPageHeader';
import { PropertyStatusSection } from '../components/property/PropertyStatusSection';
import { PropertyViewHistorySection } from '../components/property/PropertyViewHistorySection';
import {
  type PropertyFormState,
  type PropertyStatus
} from '../components/property/propertyEditor';
import { ListingReviewCard } from '../components/review/ListingReviewCard';
import { ReviewActionModal } from '../components/review/ReviewActionModal';

const PROPERTY_QUERY = gql`
  query PropertyFormPage($id: ID!) {
    property(id: $id) {
      id
      title
      description
      imageUrl
      addressLine1
      city
      postalCode
      country
      price
      surfaceSqm
      propertyType
      status
      isCoListed
      coListingCount
      coListingAgents {
        id
        name
        email
      }
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

const CREATE_PROPERTY_MUTATION = gql`
  mutation CreateProperty($input: PropertyInput!) {
    createProperty(input: $input) {
      id
    }
  }
`;

const UPDATE_PROPERTY_MUTATION = gql`
  mutation UpdateProperty($id: ID!, $input: PropertyInput!) {
    updateProperty(id: $id, input: $input) {
      id
    }
  }
`;

const DISMISS_FLAG_MUTATION = gql`
  mutation DismissFlagFromEditor($flagId: ID!, $reason: String!) {
    dismissFlag(flagId: $flagId, reason: $reason)
  }
`;

const CONFIRM_SCAM_MUTATION = gql`
  mutation ConfirmScamFromEditor($flagId: ID!, $reason: String!) {
    confirmScam(flagId: $flagId, reason: $reason)
  }
`;

const RESTORE_CONFIRMED_SCAM_MUTATION = gql`
  mutation RestoreConfirmedScamFromEditor($flagId: ID!, $reason: String!) {
    restoreConfirmedScam(flagId: $flagId, reason: $reason)
  }
`;

const emptyFormState: PropertyFormState = {
  title: '',
  description: '',
  imageUrl: '',
  addressLine1: '',
  city: '',
  postalCode: '',
  country: 'Switzerland',
  price: '',
  surfaceSqm: '',
  propertyType: 'apartment',
  status: 'DRAFT'
};

const toInput = (state: PropertyFormState) => ({
  ...state,
  price: Number(state.price),
  surfaceSqm: Number(state.surfaceSqm)
});

const validate = (state: PropertyFormState) => {
  if (state.title.trim().length < 3) {
    return 'Title must be at least 3 characters.';
  }

  if (state.description.trim().length < 10) {
    return 'Description must be at least 10 characters.';
  }

  if (state.imageUrl.trim() && !state.imageUrl.startsWith('/') && !/^https?:\/\//.test(state.imageUrl.trim())) {
    return 'Image URL must start with / or http(s)://';
  }

  if (state.addressLine1.trim().length < 3) {
    return 'Address is required.';
  }

  if (Number.isNaN(Number(state.price)) || Number(state.price) <= 0) {
    return 'Price must be a positive number.';
  }

  if (Number.isNaN(Number(state.surfaceSqm)) || Number(state.surfaceSqm) <= 0) {
    return 'Surface must be a positive number.';
  }

  return null;
};

export const PropertyFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [formState, setFormState] = useState<PropertyFormState>(emptyFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [dismissingFlagId, setDismissingFlagId] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState(
    'Reviewed manually and determined to be a false positive.'
  );
  const [confirmingFlagId, setConfirmingFlagId] = useState<string | null>(null);
  const [confirmReason, setConfirmReason] = useState(
    'Confirmed as a scam and archived from the active portfolio.'
  );
  const { data, loading: queryLoading } = useQuery(PROPERTY_QUERY, {
    variables: { id },
    skip: !id
  });
  const [createProperty, { loading: createLoading }] = useMutation(CREATE_PROPERTY_MUTATION, {
    refetchQueries: ['PropertiesPage', 'DashboardPage'],
    awaitRefetchQueries: true
  });
  const [updateProperty, { loading: updateLoading }] = useMutation(UPDATE_PROPERTY_MUTATION, {
    refetchQueries: ['PropertiesPage', 'DashboardPage', 'PropertyFormPage'],
    awaitRefetchQueries: true
  });
  const [dismissFlag, { loading: dismissing }] = useMutation(DISMISS_FLAG_MUTATION, {
    refetchQueries: ['PropertiesPage', 'DashboardPage', 'PropertyFormPage'],
    awaitRefetchQueries: true
  });
  const [confirmScam, { loading: confirming }] = useMutation(CONFIRM_SCAM_MUTATION, {
    refetchQueries: ['PropertiesPage', 'DashboardPage', 'PropertyFormPage'],
    awaitRefetchQueries: true
  });
  const [restoreConfirmedScam, { loading: restoring }] = useMutation(
    RESTORE_CONFIRMED_SCAM_MUTATION,
    {
      refetchQueries: ['PropertiesPage', 'DashboardPage', 'PropertyFormPage'],
      awaitRefetchQueries: true
    }
  );
  const isSaving = createLoading || updateLoading;

  useEffect(() => {
    if (!data?.property) {
      return;
    }

    setFormState({
      title: data.property.title,
      description: data.property.description,
      imageUrl: data.property.imageUrl ?? '',
      addressLine1: data.property.addressLine1,
      city: data.property.city,
      postalCode: data.property.postalCode,
      country: data.property.country,
      price: String(data.property.price),
      surfaceSqm: String(data.property.surfaceSqm),
      propertyType: data.property.propertyType,
      status: data.property.status
    });
  }, [data]);

  const pageEyebrow = useMemo(
    () => (isEditMode ? 'Edit Property' : 'Add Property'),
    [isEditMode]
  );
  const pageTitle = useMemo(() => {
    if (isEditMode) {
      return data?.property?.title ?? 'Edit property';
    }

    return 'Create a new listing';
  }, [data?.property?.title, isEditMode]);
  const displayFlag = data?.property ? data.property.flag ?? data.property.latestFlag : null;
  const openFlag = data?.property?.flag;
  const confirmedFlag = data?.property?.latestFlag?.status === 'CONFIRMED' ? data.property.latestFlag : null;

  const handleChange = <Key extends keyof PropertyFormState>(
    key: Key,
    value: PropertyFormState[Key]
  ) => {
    setFormState((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validate(formState);

    if (error) {
      setFormError(error);
      return;
    }

    setFormError(null);

    try {
      if (isEditMode && id) {
        await updateProperty({
          variables: {
            id,
            input: toInput(formState)
          }
        });
      } else {
        await createProperty({
          variables: {
            input: toInput(formState)
          }
        });
      }

      navigate('/properties');
    } catch (mutationError) {
      setFormError(
        mutationError instanceof Error ? mutationError.message : 'Failed to save property.'
      );
    }
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

  const handleRestoreConfirmedScam = async () => {
    if (!confirmedFlag?.id) {
      return;
    }

    await restoreConfirmedScam({
      variables: {
        flagId: confirmedFlag.id,
        reason: 'Reopened after reviewing the scam confirmation.'
      }
    });
  };

  if (queryLoading) {
    return (
      <section className="rounded-[2rem] border border-ink/10 bg-white/80 p-8 text-sm text-ink/55 shadow-sm">
        Loading property...
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PropertyPageHeader
        actions={
          <Link
            className="rounded-full border border-ink/10 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white"
            to="/properties"
          >
            Back to properties
          </Link>
        }
        badges={
          data?.property?.isCoListed ? (
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-800">
              Co-listed with {data.property.coListingCount} agent
              {data.property.coListingCount > 1 ? 's' : ''}
            </span>
          ) : null
        }
        eyebrow={pageEyebrow}
        title={pageTitle}
      />

      {data?.property?.isCoListed ? (
        <section className="rounded-[2rem] border border-sky-200 bg-sky-50/70 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">
            Co-listing partners
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.property.coListingAgents.map((agent: { id: string; name: string }) => (
              <span
                key={agent.id}
                className="rounded-full border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-sky-900"
              >
                {agent.name}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {displayFlag ? (
        <ListingReviewCard
          description="Update the listing fields below and save changes to rerun automated detection. If the suspicious signals are removed, the listing will no longer stay flagged."
          flag={displayFlag}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              {openFlag ? (
                <>
                  <button
                    className="rounded-full border border-ink/10 px-4 py-3 text-sm font-semibold text-ink/70 transition hover:bg-white disabled:opacity-50"
                    disabled={dismissing || confirming}
                    type="button"
                    onClick={() => setDismissingFlagId(openFlag.id)}
                  >
                    Dismiss flag
                  </button>
                  <button
                    className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine disabled:opacity-50"
                    disabled={dismissing || confirming}
                    type="button"
                    onClick={() => setConfirmingFlagId(openFlag.id)}
                  >
                    Confirm scam
                  </button>
                </>
              ) : null}

              {confirmedFlag ? (
                <button
                  className="rounded-full border border-pine/20 bg-pine/10 px-5 py-3 text-sm font-semibold text-pine transition hover:bg-pine hover:text-white disabled:opacity-50"
                  disabled={restoring}
                  type="button"
                  onClick={() => void handleRestoreConfirmedScam()}
                >
                  {restoring ? 'Restoring...' : 'Remove scam confirmation'}
                </button>
              ) : null}
            </div>
          }
        />
      ) : null}

      <PropertyStatusSection
        formState={formState}
        isEditMode={isEditMode}
        isSaving={isSaving}
        onStatusChange={(value) => handleChange('status', value)}
      />

      <PropertyEditorForm
        formError={formError}
        formState={formState}
        isEditMode={isEditMode}
        isSaving={isSaving}
        onFieldChange={handleChange}
        onSubmit={handleSubmit}
      />

      {isEditMode ? (
        <PropertyViewHistorySection
          emptyMessage="No tracked views yet for this property."
          eyebrow="View History"
          title="Recent listing traffic"
          views={data?.property.viewHistory ?? []}
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
    </section>
  );
};
