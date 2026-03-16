type ReviewActionModalProps = {
  title: string;
  heading: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmPendingLabel: string;
  closeAriaLabel: string;
  isSubmitting: boolean;
};

export const ReviewActionModal = ({
  title,
  heading,
  description,
  value,
  onChange,
  onClose,
  onConfirm,
  confirmLabel,
  confirmPendingLabel,
  closeAriaLabel,
  isSubmitting
}: ReviewActionModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
    <button
      aria-label={closeAriaLabel}
      className="absolute inset-0 bg-ink/30"
      type="button"
      onClick={() => {
        if (isSubmitting) {
          return;
        }

        onClose();
      }}
    />
    <section className="relative w-full max-w-lg rounded-[2rem] border border-ink/10 bg-sand/95 p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold">{title}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{heading}</h3>
          <p className="mt-3 text-sm leading-6 text-ink/65">{description}</p>
        </div>
        <button
          className="rounded-full border border-ink/10 px-3 py-2 text-sm font-semibold text-ink/60 transition hover:bg-white disabled:opacity-50"
          disabled={isSubmitting}
          type="button"
          onClick={onClose}
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
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          className="rounded-full border border-ink/10 px-4 py-3 text-sm font-semibold text-ink/65 transition hover:bg-white disabled:opacity-50"
          disabled={isSubmitting}
          type="button"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine disabled:opacity-50"
          disabled={isSubmitting || !value.trim()}
          type="button"
          onClick={onConfirm}
        >
          {isSubmitting ? confirmPendingLabel : confirmLabel}
        </button>
      </div>
    </section>
  </div>
);
