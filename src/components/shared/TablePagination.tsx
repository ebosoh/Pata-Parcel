import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEFAULT_PAGE_SIZE_OPTIONS } from '@/hooks/usePagination';

interface TablePaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: readonly number[];
}

function getVisiblePages(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: Array<number | 'ellipsis'> = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  if (left > 2) pages.push('ellipsis');
  for (let p = left; p <= right; p += 1) pages.push(p);
  if (right < total - 1) pages.push('ellipsis');
  pages.push(total);

  return pages;
}

/**
 * Shared footer pagination bar for data tables (row range, rows-per-page selector, and page buttons).
 */
export function TablePagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  startItem,
  endItem,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: TablePaginationProps) {
  if (totalItems === 0) return null;

  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <div className="border-t border-border/60 bg-muted/20 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <span>
          Showing <strong className="text-foreground">{startItem}</strong>–
          <strong className="text-foreground">{endItem}</strong> of{' '}
          <strong className="text-foreground">{totalItems}</strong>
        </span>

        <label className="flex items-center gap-1.5">
          <span>Rows:</span>
          <select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-7 rounded-md border border-border bg-background px-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </div>

      {totalPages > 1 && (
        <nav aria-label="Table pagination" className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="h-7 px-2 text-xs cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline ml-0.5">Prev</span>
          </Button>

          {visiblePages.map((entry, idx) =>
            entry === 'ellipsis' ? (
              <span
                key={`ellipsis-${idx}`}
                aria-hidden
                className="flex h-7 w-7 items-center justify-center text-muted-foreground"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </span>
            ) : (
              <Button
                key={entry}
                type="button"
                variant={entry === page ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(entry)}
                aria-current={entry === page ? 'page' : undefined}
                className="h-7 w-7 p-0 text-xs font-semibold cursor-pointer"
              >
                {entry}
              </Button>
            ),
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-7 px-2 text-xs cursor-pointer"
            aria-label="Next page"
          >
            <span className="hidden sm:inline mr-0.5">Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </nav>
      )}
    </div>
  );
}
