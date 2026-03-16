type PropertySummaryPanelProps = {
  price: number;
  surfaceSqm: number;
  status: string;
  propertyType: string;
  viewCount: number;
  createdAt: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  country: string;
};

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

export const PropertySummaryPanel = ({
  price,
  surfaceSqm,
  status,
  propertyType,
  viewCount,
  createdAt,
  addressLine1,
  postalCode,
  city,
  country
}: PropertySummaryPanelProps) => (
  <section className="rounded-[2rem] border border-ink/10 bg-white/80 p-6 shadow-sm">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <article className="rounded-[1.5rem] bg-sand/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Price</p>
        <p className="mt-2 text-2xl font-semibold text-ink">{formatCurrency(price)}</p>
      </article>
      <article className="rounded-[1.5rem] bg-sand/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Surface</p>
        <p className="mt-2 text-2xl font-semibold text-ink">{surfaceSqm} sqm</p>
      </article>
      <article className="rounded-[1.5rem] bg-sand/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Status</p>
        <p className="mt-2 text-2xl font-semibold text-ink">{status.toLowerCase()}</p>
      </article>
      <article className="rounded-[1.5rem] bg-sand/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Type</p>
        <p className="mt-2 text-xl font-semibold text-ink">{propertyType}</p>
      </article>
      <article className="rounded-[1.5rem] bg-sand/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Views</p>
        <p className="mt-2 text-2xl font-semibold text-ink">{viewCount}</p>
      </article>
      <article className="rounded-[1.5rem] bg-sand/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Created</p>
        <p className="mt-2 text-lg font-semibold text-ink">{formatDateTime(createdAt)}</p>
      </article>
    </div>

    <div className="mt-6 rounded-[1.5rem] border border-ink/10 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Address</p>
      <p className="mt-2 text-lg font-semibold text-ink">{addressLine1}</p>
      <p className="mt-1 text-sm text-ink/65">
        {postalCode} {city}, {country}
      </p>
    </div>
  </section>
);
