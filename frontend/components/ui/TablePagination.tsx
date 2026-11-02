import { ChevronLeft, ChevronRight, ChevronsRight, ChevronsLeft  } from "lucide-react";

export function TablePagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pages: number[] = [];

  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="pagination">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(1)}
        aria-label="Halaman sebelumnya"
      >
        <ChevronsLeft size={14}/>
      </button>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft size={14}/>
      </button>

      {start > 1 && (
        <>
          <button
            type="button"
            onClick={() => onPageChange(1)}
          >
            1
          </button>

          {start > 2 && (
            <span>...</span>
          )}
        </>
      )}

      {pages.map((number) => (
        <button
          type="button"
          key={number}
          className={number === page ? "active" : ""}
          onClick={() => onPageChange(number)}
        >
          {number}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span>...</span>
          )}

          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Halaman berikutnya"
      >
        <ChevronRight size={14}/>
      </button>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(totalPages)}
        aria-label="Halaman berikutnya"
      >
        <ChevronsRight size={14}/>
      </button>
    </div>
  );
}