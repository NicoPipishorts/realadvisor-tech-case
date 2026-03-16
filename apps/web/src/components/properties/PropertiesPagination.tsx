type PropertiesPaginationProps = {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPrevious: () => void;
  onNext: () => void;
};

export const PropertiesPagination = ({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPrevious,
  onNext
}: PropertiesPaginationProps) => (
  <div className="flex items-center justify-between px-2 pb-2 pt-4 text-sm text-ink/55">
    <span>
      Showing {Math.min((page - 1) * pageSize + 1, totalCount)}-{Math.min(page * pageSize, totalCount)} of{' '}
      {totalCount}
    </span>
    <div className="flex items-center gap-2">
      <button
        className="rounded-full border border-ink/10 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        onClick={onPrevious}
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
        onClick={onNext}
        disabled={page >= totalPages}
      >
        Next
      </button>
    </div>
  </div>
);
