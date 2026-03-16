import { gql, useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const columns = ['Title', 'Price', 'Status', 'Views', 'Created', 'Actions'];
const statuses = [
  { label: 'All', value: null },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Sold', value: 'SOLD' },
  { label: 'Archived', value: 'ARCHIVED' },
  { label: 'Draft', value: 'DRAFT' }
] as const;
const flaggedFilter = { label: 'Flagged', value: 'FLAGGED' } as const;

const PROPERTIES_QUERY = gql`
  query PropertiesPage(
    $status: PropertyStatus
    $flaggedOnly: Boolean
    $fromDate: String
    $toDate: String
    $page: Int!
    $pageSize: Int!
  ) {
    properties(
      status: $status
      flaggedOnly: $flaggedOnly
      fromDate: $fromDate
      toDate: $toDate
      page: $page
      pageSize: $pageSize
    ) {
      totalCount
      nodes {
        id
        title
        price
        status
        createdAt
        viewCount
        isFlagged
        flag {
          confidenceScore
          primaryReason
        }
      }
    }
  }
`;

const DELETE_PROPERTY_MUTATION = gql`
  mutation DeleteProperty($id: ID!) {
    deleteProperty(id: $id)
  }
`;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0
  }).format(value);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

export const PropertiesPage = () => {
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<
    (typeof statuses)[number]['value'] | typeof flaggedFilter.value
  >(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data, loading, error } = useQuery(PROPERTIES_QUERY, {
    variables: {
      flaggedOnly: selectedStatus === flaggedFilter.value,
      status: selectedStatus === flaggedFilter.value ? null : selectedStatus,
      fromDate: fromDate || null,
      toDate: toDate || null,
      page,
      pageSize
    },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true
  });
  const [deleteProperty, { loading: deleteLoading }] = useMutation(DELETE_PROPERTY_MUTATION, {
    refetchQueries: ['PropertiesPage', 'DashboardPage'],
    awaitRefetchQueries: true
  });
  const totalCount = data?.properties.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleDelete = async (id: string, title: string) => {
    const confirmed = window.confirm(`Delete "${title}"? This action cannot be undone.`);

    if (!confirmed) {
      return;
    }

    await deleteProperty({
      variables: { id }
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold">
            Properties
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            Manage portfolio inventory.
          </h2>
        </div>
        <button
          className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine"
          type="button"
          onClick={() => navigate('/properties/new')}
        >
          Add property
        </button>
      </div>

      <div className="rounded-[2rem] border border-ink/10 bg-white/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3 border-b border-ink/10 px-2 pb-4">
          <div className="flex flex-wrap gap-3">
            {[...statuses, flaggedFilter].map((status) => {
              const isActive = selectedStatus === status.value;

              return (
                <button
                  key={status.label}
                  className={[
                    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-pine text-white' : 'text-ink/70 hover:bg-sand'
                  ].join(' ')}
                  type="button"
                  onClick={() => {
                    setSelectedStatus(status.value);
                    setPage(1);
                  }}
                >
                  {status.label}
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex flex-wrap items-end gap-3">
            <label className="block min-w-[9rem]">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                From
              </span>
              <input
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pine"
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className="block min-w-[9rem]">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                To
              </span>
              <input
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pine"
                type="date"
                value={toDate}
                onChange={(event) => {
                  setToDate(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <button
              className="rounded-full border border-ink/10 px-4 py-3 text-sm font-semibold text-ink/65 transition hover:bg-white"
              type="button"
              onClick={() => {
                setFromDate('');
                setToDate('');
                setPage(1);
              }}
            >
              Clear dates
            </button>
          </div>
        </div>

        {error ? (
          <div className="px-4 pt-4 text-sm text-red-700">{error.message}</div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3 px-2">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="px-4 pt-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-ink/45"
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
                    colSpan={columns.length}
                    className="rounded-2xl border border-dashed border-ink/15 px-4 py-16 text-center text-sm text-ink/50"
                  >
                    Loading properties...
                  </td>
                </tr>
              ) : data?.properties.nodes.length ? (
                data.properties.nodes.map(
                  (property: {
                    id: string;
                    title: string;
                    price: number;
                    status: string;
                    viewCount: number;
                    createdAt: string;
                    isFlagged: boolean;
                    flag: null | { confidenceScore: number; primaryReason: string };
                    }) => (
                      <tr
                        key={property.id}
                        className={[
                          'cursor-pointer transition',
                          property.isFlagged
                            ? 'bg-sand/35 hover:bg-sand/55'
                            : 'bg-sand/35 hover:bg-sand/55'
                        ].join(' ')}
                        onClick={() => navigate(`/properties/${property.id}`)}
                      >
                      <td
                        className={[
                          'rounded-l-2xl px-4 py-4',
                          property.isFlagged ? 'border border-r-0 border-amber-200 bg-amber-50/70' : ''
                        ].join(' ')}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-ink">{property.title}</span>
                          {property.isFlagged ? (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
                              Flagged
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td
                        className={[
                          'px-4 py-4 text-sm text-ink/70',
                          property.isFlagged ? 'border-y border-amber-200 bg-amber-50/70' : ''
                        ].join(' ')}
                      >
                        {formatCurrency(property.price)}
                      </td>
                      <td
                        className={[
                          'px-4 py-4 text-sm text-ink/70',
                          property.isFlagged ? 'border-y border-amber-200 bg-amber-50/70' : ''
                        ].join(' ')}
                      >
                        {property.status.toLowerCase()}
                      </td>
                      <td
                        className={[
                          'px-4 py-4 text-sm font-semibold text-ink',
                          property.isFlagged ? 'border-y border-amber-200 bg-amber-50/70' : ''
                        ].join(' ')}
                      >
                        {property.viewCount}
                      </td>
                      <td
                        className={[
                          'px-4 py-4 text-sm text-ink/60',
                          property.isFlagged ? 'border-y border-amber-200 bg-amber-50/70' : ''
                        ].join(' ')}
                      >
                        {formatDate(property.createdAt)}
                      </td>
                      <td
                        className={[
                          'rounded-r-2xl px-4 py-4',
                          property.isFlagged ? 'border border-l-0 border-amber-200 bg-amber-50/70' : ''
                        ].join(' ')}
                      >
                        <div className="flex items-center gap-2">
                          <Link
                            className="rounded-full border border-ink/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60 transition hover:bg-white"
                            to={`/properties/${property.id}/edit`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            Edit
                          </Link>
                          <button
                            className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                            disabled={deleteLoading}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDelete(property.id, property.title);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="rounded-2xl border border-dashed border-ink/15 px-4 py-16 text-center text-sm text-ink/50"
                  >
                    No properties match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-2 pb-2 pt-4 text-sm text-ink/55">
          <span>
            Showing {Math.min((page - 1) * pageSize + 1, totalCount)}-
            {Math.min(page * pageSize, totalCount)} of {totalCount}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-ink/10 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              className="rounded-full border border-ink/10 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
