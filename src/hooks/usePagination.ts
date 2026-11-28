import { useMemo, useState } from 'react';

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 15, 25, 50] as const;

export interface PaginationState<T> {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  paginatedItems: T[];
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

/**
 * Client-side pagination state that automatically clamps the active page
 * when the underlying filtered item list shrinks.
 */
export function usePagination<T>(
  items: T[],
  defaultPageSize = 15,
): PaginationState<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  const setPageSize = (nextSize: number) => {
    setPageSizeState(nextSize);
    setPage(1);
  };

  return {
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    startItem,
    endItem,
    paginatedItems,
    setPage: (nextPage: number) => setPage(Math.min(Math.max(1, nextPage), totalPages)),
    setPageSize,
  };
}
