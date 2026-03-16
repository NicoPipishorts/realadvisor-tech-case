import {
  flaggedPropertyFilter,
  propertyStatuses,
  type PropertyStatusFilterValue
} from './types';

type PropertiesFiltersProps = {
  selectedStatus: PropertyStatusFilterValue;
  fromDate: string;
  toDate: string;
  onStatusChange: (value: PropertyStatusFilterValue) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onClearDates: () => void;
};

export const PropertiesFilters = ({
  selectedStatus,
  fromDate,
  toDate,
  onStatusChange,
  onFromDateChange,
  onToDateChange,
  onClearDates
}: PropertiesFiltersProps) => (
  <div className="flex flex-wrap items-end gap-3 border-b border-ink/10 px-2 pb-4">
    <div className="flex flex-wrap gap-3">
      {[...propertyStatuses, flaggedPropertyFilter].map((status) => {
        const isActive = selectedStatus === status.value;

        return (
          <button
            key={status.label}
            className={[
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-pine text-white' : 'text-ink/70 hover:bg-sand'
            ].join(' ')}
            type="button"
            onClick={() => onStatusChange(status.value)}
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
          onChange={(event) => onFromDateChange(event.target.value)}
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
          onChange={(event) => onToDateChange(event.target.value)}
        />
      </label>
      <button
        className="rounded-full border border-ink/10 px-4 py-3 text-sm font-semibold text-ink/65 transition hover:bg-white"
        type="button"
        onClick={onClearDates}
      >
        Clear dates
      </button>
    </div>
  </div>
);
