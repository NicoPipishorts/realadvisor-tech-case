import type { PropertyFormState, PropertyStatus } from './propertyEditor';
import { statusOptions } from './propertyEditor';

type PropertyStatusSectionProps = {
  formState: PropertyFormState;
  isSaving: boolean;
  isEditMode: boolean;
  onStatusChange: (value: PropertyStatus) => void;
};

export const PropertyStatusSection = ({
  formState,
  isSaving,
  isEditMode,
  onStatusChange
}: PropertyStatusSectionProps) => (
  <section className="rounded-[2rem] border border-ink/10 bg-white/80 p-6 shadow-sm">
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold">
        Listing Status
      </p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        Change lifecycle state quickly
      </h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
        Use this control when the main change is operational, like moving a listing from draft to
        active or from active to sold.
      </p>
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
              onClick={() => onStatusChange(option.value)}
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
);
