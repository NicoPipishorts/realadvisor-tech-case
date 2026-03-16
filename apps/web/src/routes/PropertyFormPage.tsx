import { gql, useMutation, useQuery } from '@apollo/client';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

type PropertyStatus = 'DRAFT' | 'ACTIVE' | 'SOLD' | 'ARCHIVED';

type PropertyFormState = {
  title: string;
  description: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  country: string;
  price: string;
  surfaceSqm: string;
  propertyType: string;
  status: PropertyStatus;
};

const PROPERTY_QUERY = gql`
  query PropertyFormPage($id: ID!) {
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
  addressLine1: '',
  city: '',
  postalCode: '',
  country: 'Switzerland',
  price: '',
  surfaceSqm: '',
  propertyType: 'apartment',
  status: 'DRAFT'
};

const statusOptions: Array<{ label: string; value: PropertyStatus; description: string }> = [
  {
    label: 'Draft',
    value: 'DRAFT',
    description: 'Keep it private while preparing the listing.'
  },
  {
    label: 'Active',
    value: 'ACTIVE',
    description: 'Publish it as a live listing for buyers.'
  },
  {
    label: 'Sold',
    value: 'SOLD',
    description: 'Mark the transaction as completed.'
  },
  {
    label: 'Archived',
    value: 'ARCHIVED',
    description: 'Remove it from the active portfolio without deleting it.'
  }
];

const propertyTypeOptions = ['apartment', 'house', 'loft', 'villa', 'studio'];

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

const formatViewDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

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
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold">
            {pageEyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{pageTitle}</h2>
        </div>
        <Link
          className="rounded-full border border-ink/10 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white"
          to="/properties"
        >
          Back to properties
        </Link>
      </div>

      {displayFlag ? (
        <section className="rounded-[2rem] border border-amber-200 bg-white/80 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                <AlertIcon />
                <span>Listing Review</span>
              </div>
              <h3 className="mt-2 text-xl font-semibold text-ink">{displayFlag.primaryReason}</h3>
              <p className="mt-3 text-sm leading-6 text-ink/65">
                Update the listing fields below and save changes to rerun automated detection. If
                the suspicious signals are removed, the listing will no longer stay flagged.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
                {displayFlag.status.toLowerCase()}
              </span>
              <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">
                {displayFlag.triggeredRule.replaceAll('_', ' ')}
              </span>
              <span className="rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink/70">
                Score {displayFlag.confidenceScore}
              </span>
            </div>
          </div>

          {displayFlag.reviewReason ? (
            <div className="mt-4 rounded-[1.5rem] border border-ink/10 bg-sand/35 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                Review note
              </p>
              <p className="mt-2 text-sm text-ink/65">{displayFlag.reviewReason}</p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
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
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-ink/10 bg-white/80 p-6 shadow-sm">
        <div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold">
              Listing Status
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              Change lifecycle state quickly
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
              Use this control when the main change is operational, like moving a listing from
              draft to active or from active to sold.
            </p>
          </div>
        </div>

        <fieldset className="mt-6 block">
          <legend className="mb-3 block text-sm font-medium text-ink/70">Status</legend>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {statusOptions.map((option) => {
              const isSelected = formState.status === option.value;

              return (
                <button
                  key={option.value}
                  className={[
                    'rounded-[1.5rem] border px-4 py-4 text-left transition',
                    isSelected
                      ? 'border-pine bg-pine text-white shadow-sm'
                      : 'border-ink/10 bg-sand/35 text-ink hover:bg-white'
                  ].join(' ')}
                  type="button"
                  onClick={() => handleChange('status', option.value)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-base font-semibold">{option.label}</span>
                    <span
                      className={[
                        'h-4 w-4 rounded-full border',
                        isSelected ? 'border-white bg-white' : 'border-ink/20 bg-transparent'
                      ].join(' ')}
                    />
                  </div>
                  <p
                    className={[
                      'mt-3 text-sm leading-6',
                      isSelected ? 'text-white/80' : 'text-ink/60'
                    ].join(' ')}
                  >
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-6 flex items-center gap-3">
          <button
            className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine disabled:opacity-60"
            disabled={isSaving}
            form="property-form"
            type="submit"
          >
            {isSaving ? 'Saving...' : isEditMode ? 'Save changes' : 'Create property'}
          </button>
        </div>
      </section>

      <form
        id="property-form"
        className="grid gap-6 rounded-[2rem] border border-ink/10 bg-white/80 p-6 shadow-sm lg:grid-cols-2"
        onSubmit={handleSubmit}
      >
        <label className="block lg:col-span-2">
          <span className="mb-2 block text-sm font-medium text-ink/70">Title</span>
          <input
            className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-pine"
            value={formState.title}
            onChange={(event) => handleChange('title', event.target.value)}
          />
        </label>

        <label className="block lg:col-span-2">
          <span className="mb-2 block text-sm font-medium text-ink/70">Description</span>
          <textarea
            className="min-h-32 w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-pine"
            value={formState.description}
            onChange={(event) => handleChange('description', event.target.value)}
          />
        </label>

        <label className="block lg:col-span-2">
          <span className="mb-2 block text-sm font-medium text-ink/70">Address</span>
          <input
            className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-pine"
            value={formState.addressLine1}
            onChange={(event) => handleChange('addressLine1', event.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-ink/70">City</span>
          <input
            className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-pine"
            value={formState.city}
            onChange={(event) => handleChange('city', event.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-ink/70">Postal code</span>
          <input
            className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-pine"
            value={formState.postalCode}
            onChange={(event) => handleChange('postalCode', event.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-ink/70">Country</span>
          <input
            className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-pine"
            value={formState.country}
            onChange={(event) => handleChange('country', event.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-ink/70">Property type</span>
          <select
            className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-pine"
            value={formState.propertyType}
            onChange={(event) => handleChange('propertyType', event.target.value)}
          >
            {propertyTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-ink/70">Price</span>
          <input
            className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-pine"
            inputMode="decimal"
            value={formState.price}
            onChange={(event) => handleChange('price', event.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-ink/70">Surface (sqm)</span>
          <input
            className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-pine"
            inputMode="decimal"
            value={formState.surfaceSqm}
            onChange={(event) => handleChange('surfaceSqm', event.target.value)}
          />
        </label>

        {formError ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:col-span-2">
            {formError}
          </p>
        ) : null}

        <div className="flex items-center gap-3 lg:col-span-2">
          <button
            className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? 'Saving...' : isEditMode ? 'Save changes' : 'Create property'}
          </button>
          <Link
            className="rounded-full border border-ink/10 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white"
            to="/properties"
          >
            Cancel
          </Link>
        </div>
      </form>

      {isEditMode ? (
        <section className="rounded-[2rem] border border-ink/10 bg-white/80 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold">
                View History
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                Recent listing traffic
              </h3>
            </div>
            <p className="text-sm text-ink/50">
              {data?.property.viewHistory.length ?? 0} recent tracked views
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {data?.property.viewHistory.length ? (
              data.property.viewHistory.map(
                (view: {
                  id: string;
                  viewerType: string;
                  visitorId: string | null;
                  viewedAt: string;
                }) => (
                  <article
                    key={view.id}
                    className="flex items-center justify-between rounded-[1.5rem] border border-ink/10 bg-sand/35 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {view.viewerType.toLowerCase()}
                      </p>
                      <p className="text-xs text-ink/50">
                        {view.visitorId ? `Visitor: ${view.visitorId}` : 'No visitor id'}
                      </p>
                    </div>
                    <p className="text-sm text-ink/60">{formatViewDate(view.viewedAt)}</p>
                  </article>
                )
              )
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-ink/15 px-4 py-12 text-center text-sm text-ink/50">
                No tracked views yet for this property.
              </div>
            )}
          </div>
        </section>
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
    </section>
  );
};
