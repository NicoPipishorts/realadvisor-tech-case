import type { TopViewedProperty } from './types';

type TopViewedPropertiesTableProps = {
  loading: boolean;
  properties: TopViewedProperty[];
  onOpen: (propertyId: string) => void;
};

export const TopViewedPropertiesTable = ({
  loading,
  properties,
  onOpen
}: TopViewedPropertiesTableProps) => (
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
          ) : properties.length ? (
            properties.map((property) => (
              <tr
                key={property.id}
                className="cursor-pointer bg-sand/35 transition hover:bg-sand/55"
                onClick={() => onOpen(property.id)}
              >
                <td className="rounded-l-2xl px-4 py-4 font-medium text-ink">{property.title}</td>
                <td className="px-4 py-4 text-center text-sm text-ink/60">
                  {property.status.toLowerCase()}
                </td>
                <td className="rounded-r-2xl px-4 py-4 text-center text-sm font-semibold text-ink">
                  {property.viewCount}
                </td>
              </tr>
            ))
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
);
