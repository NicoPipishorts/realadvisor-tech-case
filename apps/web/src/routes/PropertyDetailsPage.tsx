import { gql, useMutation, useQuery } from '@apollo/client';
import { Link, useNavigate, useParams } from 'react-router-dom';

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
        confidenceScore
        primaryReason
        triggeredRule
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0
  }).format(value);

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

export const PropertyDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
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

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold">
            Property Preview
          </p>
          <h2 className="mt-2 text-4xl font-semibold tracking-tight text-ink">
            {property.title}
          </h2>
          <p className="mt-3 text-base leading-7 text-ink/70">{property.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
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
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-[2rem] border border-ink/10 bg-white/80 p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-[1.5rem] bg-sand/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                Price
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink">{formatCurrency(property.price)}</p>
            </article>
            <article className="rounded-[1.5rem] bg-sand/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                Surface
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink">{property.surfaceSqm} sqm</p>
            </article>
            <article className="rounded-[1.5rem] bg-sand/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                Status
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {property.status.toLowerCase()}
              </p>
            </article>
            <article className="rounded-[1.5rem] bg-sand/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                Type
              </p>
              <p className="mt-2 text-xl font-semibold text-ink">{property.propertyType}</p>
            </article>
            <article className="rounded-[1.5rem] bg-sand/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                Views
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink">{property.viewCount}</p>
            </article>
            <article className="rounded-[1.5rem] bg-sand/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                Created
              </p>
              <p className="mt-2 text-lg font-semibold text-ink">{formatDateTime(property.createdAt)}</p>
            </article>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-ink/10 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
              Address
            </p>
            <p className="mt-2 text-lg font-semibold text-ink">{property.addressLine1}</p>
            <p className="mt-1 text-sm text-ink/65">
              {property.postalCode} {property.city}, {property.country}
            </p>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-ink/10 bg-white/80 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-ink">Flag status</h3>
              {property.isFlagged ? (
                <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold">
                  Flagged
                </span>
              ) : (
                <span className="rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-pine">
                  Clean
                </span>
              )}
            </div>
            {property.flag ? (
              <div className="mt-4 rounded-[1.5rem] bg-sand/40 p-4">
                <p className="text-sm font-semibold text-ink">{property.flag.primaryReason}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ink/45">
                  {property.flag.triggeredRule.replaceAll('_', ' ')} · {property.flag.confidenceScore}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink/60">No suspicious flags are currently open.</p>
            )}
          </section>

          <section className="rounded-[2rem] border border-ink/10 bg-white/80 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-ink">Recent views</h3>
            <div className="mt-4 space-y-3">
              {property.viewHistory.length ? (
                property.viewHistory.map(
                  (view: {
                    id: string;
                    viewerType: string;
                    visitorId: string | null;
                    viewedAt: string;
                  }) => (
                    <article
                      key={view.id}
                      className="rounded-[1.5rem] border border-ink/10 bg-sand/35 px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-ink">
                        {view.viewerType.toLowerCase()}
                      </p>
                      <p className="mt-1 text-xs text-ink/50">
                        {view.visitorId ? `Visitor: ${view.visitorId}` : 'No visitor id'}
                      </p>
                      <p className="mt-2 text-sm text-ink/60">{formatDateTime(view.viewedAt)}</p>
                    </article>
                  )
                )
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-ink/15 px-4 py-12 text-center text-sm text-ink/50">
                  No tracked views yet.
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
};
