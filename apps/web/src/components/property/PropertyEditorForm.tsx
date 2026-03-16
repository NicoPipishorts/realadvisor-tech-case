import { Link } from 'react-router-dom';

import { propertyTypeOptions, type PropertyFormState } from './propertyEditor';

type PropertyEditorFormProps = {
  formState: PropertyFormState;
  formError: string | null;
  isSaving: boolean;
  isEditMode: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onFieldChange: <Key extends keyof PropertyFormState>(
    key: Key,
    value: PropertyFormState[Key]
  ) => void;
};

export const PropertyEditorForm = ({
  formState,
  formError,
  isSaving,
  isEditMode,
  onSubmit,
  onFieldChange
}: PropertyEditorFormProps) => (
  <form
    id="property-form"
    className="grid gap-6 rounded-[2rem] border border-ink/10 bg-white/80 p-6 shadow-sm lg:grid-cols-2"
    onSubmit={onSubmit}
  >
    <label className="block lg:col-span-2">
      <span className="mb-2 block text-sm font-medium text-ink/70">Title</span>
      <input
        className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-pine"
        value={formState.title}
        onChange={(event) => onFieldChange('title', event.target.value)}
      />
    </label>

    <label className="block lg:col-span-2">
      <span className="mb-2 block text-sm font-medium text-ink/70">Description</span>
      <textarea
        className="min-h-32 w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-pine"
        value={formState.description}
        onChange={(event) => onFieldChange('description', event.target.value)}
      />
    </label>

    <label className="block lg:col-span-2">
      <span className="mb-2 block text-sm font-medium text-ink/70">Address</span>
      <input
        className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-pine"
        value={formState.addressLine1}
        onChange={(event) => onFieldChange('addressLine1', event.target.value)}
      />
    </label>

    <label className="block">
      <span className="mb-2 block text-sm font-medium text-ink/70">City</span>
      <input
        className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-pine"
        value={formState.city}
        onChange={(event) => onFieldChange('city', event.target.value)}
      />
    </label>

    <label className="block">
      <span className="mb-2 block text-sm font-medium text-ink/70">Postal code</span>
      <input
        className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-pine"
        value={formState.postalCode}
        onChange={(event) => onFieldChange('postalCode', event.target.value)}
      />
    </label>

    <label className="block">
      <span className="mb-2 block text-sm font-medium text-ink/70">Country</span>
      <input
        className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-pine"
        value={formState.country}
        onChange={(event) => onFieldChange('country', event.target.value)}
      />
    </label>

    <label className="block">
      <span className="mb-2 block text-sm font-medium text-ink/70">Property type</span>
      <select
        className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-pine"
        value={formState.propertyType}
        onChange={(event) => onFieldChange('propertyType', event.target.value)}
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
        onChange={(event) => onFieldChange('price', event.target.value)}
      />
    </label>

    <label className="block">
      <span className="mb-2 block text-sm font-medium text-ink/70">Surface (sqm)</span>
      <input
        className="w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 outline-none transition focus:border-pine"
        inputMode="decimal"
        value={formState.surfaceSqm}
        onChange={(event) => onFieldChange('surfaceSqm', event.target.value)}
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
);
