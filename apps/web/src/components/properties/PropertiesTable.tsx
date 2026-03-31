import { Link } from 'react-router-dom';

import { CoListingIcon } from '../icons/CoListingIcon';
import { EditIcon } from '../icons/EditIcon';
import { TrashIcon } from '../icons/TrashIcon';
import type { PropertyListItem } from './types';

const columns = ['Title', 'Price', 'Status', 'Views', 'Created', 'Actions'];

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

const flaggedCellClass = 'border border-amber-200 bg-amber-50/70';
const flaggedMiddleCellClass = 'border-y border-amber-200 bg-amber-50/70';

type PropertiesTableProps = {
  loading: boolean;
  deleteLoading: boolean;
  properties: PropertyListItem[];
  onOpen: (propertyId: string) => void;
  onDelete: (propertyId: string, title: string) => void;
};

export const PropertiesTable = ({
  loading,
  deleteLoading,
  properties,
  onOpen,
  onDelete
}: PropertiesTableProps) => (
  <div className="overflow-x-auto px-5">
    <table className="min-w-full border-separate border-spacing-y-3">
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
        ) : properties.length ? (
          properties.map((property) => (
            <tr
              key={property.id}
              className="cursor-pointer bg-sand/35 transition hover:bg-sand/55"
              onClick={() => onOpen(property.id)}
            >
              <td
                className={[
                  'relative rounded-l-2xl px-4 py-4',
                  property.isCoListed ? 'pl-11' : '',
                  property.isFlagged ? `${flaggedCellClass} border-r-0` : ''
                ].join(' ')}
              >
                {property.isCoListed ? (
                  <span
                    className="absolute left-0 top-1/2 inline-flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-sky-200 bg-sky-100 text-sky-800 shadow-sm"
                    title={`Co-listed with ${property.coListingCount} partner${property.coListingCount > 1 ? 's' : ''}`}
                  >
                    <CoListingIcon />
                  </span>
                ) : null}
                <div className="flex items-center gap-3">
                  <span className="font-medium text-ink">{property.title}</span>
                  {property.isFlagged ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
                      Flagged
                    </span>
                  ) : null}
                </div>
              </td>
              <td className={['px-4 py-4 text-sm text-ink/70', property.isFlagged ? flaggedMiddleCellClass : ''].join(' ')}>
                {formatCurrency(property.price)}
              </td>
              <td className={['px-4 py-4 text-sm text-ink/70', property.isFlagged ? flaggedMiddleCellClass : ''].join(' ')}>
                {property.status.toLowerCase()}
              </td>
              <td
                className={[
                  'px-4 py-4 text-sm font-semibold text-ink',
                  property.isFlagged ? flaggedMiddleCellClass : ''
                ].join(' ')}
              >
                {property.viewCount}
              </td>
              <td className={['px-4 py-4 text-sm text-ink/60', property.isFlagged ? flaggedMiddleCellClass : ''].join(' ')}>
                {formatDate(property.createdAt)}
              </td>
              <td
                className={[
                  'rounded-r-2xl px-4 py-4',
                  property.isFlagged ? `${flaggedCellClass} border-l-0` : ''
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <Link
                    aria-label={`Edit ${property.title}`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 text-ink/60 transition hover:bg-white"
                    title="Edit listing"
                    to={`/properties/${property.id}/edit`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <EditIcon />
                  </Link>
                  <button
                    aria-label={`Delete ${property.title}`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-200 text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                    disabled={deleteLoading}
                    title="Delete listing"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(property.id, property.title);
                    }}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </td>
            </tr>
          ))
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
);
