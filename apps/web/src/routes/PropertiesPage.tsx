import { gql, useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PropertiesFilters } from '../components/properties/PropertiesFilters';
import { PropertiesPagination } from '../components/properties/PropertiesPagination';
import { PropertiesTable } from '../components/properties/PropertiesTable';
import {
  flaggedPropertyFilter,
  type PropertyListItem,
  type PropertyStatusFilterValue
} from '../components/properties/types';

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
        isCoListed
        coListingCount
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

export const PropertiesPage = () => {
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<PropertyStatusFilterValue>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data, loading, error } = useQuery(PROPERTIES_QUERY, {
    variables: {
      flaggedOnly: selectedStatus === flaggedPropertyFilter.value,
      status: selectedStatus === flaggedPropertyFilter.value ? null : selectedStatus,
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
        <PropertiesFilters
          fromDate={fromDate}
          onClearDates={() => {
            setFromDate('');
            setToDate('');
            setPage(1);
          }}
          onFromDateChange={(value) => {
            setFromDate(value);
            setPage(1);
          }}
          onStatusChange={(value) => {
            setSelectedStatus(value);
            setPage(1);
          }}
          onToDateChange={(value) => {
            setToDate(value);
            setPage(1);
          }}
          selectedStatus={selectedStatus}
          toDate={toDate}
        />

        {error ? (
          <div className="px-4 pt-4 text-sm text-red-700">{error.message}</div>
        ) : null}

        <PropertiesTable
          deleteLoading={deleteLoading}
          loading={loading}
          onDelete={(propertyId, title) => {
            void handleDelete(propertyId, title);
          }}
          onOpen={(propertyId) => navigate(`/properties/${propertyId}`)}
          properties={(data?.properties.nodes ?? []) as PropertyListItem[]}
        />

        <PropertiesPagination
          onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
          onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          totalPages={totalPages}
        />
      </div>
    </section>
  );
};
