'use client';

import { useState, useCallback } from 'react';

interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
}

export function usePagination(options: UsePaginationOptions = {}) {
  const [page, setPage] = useState(options.initialPage || 1);
  const [limit] = useState(options.initialLimit || 20);
  const [sortBy, setSortBy] = useState(options.initialSortBy || 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(options.initialSortOrder || 'desc');
  const [search, setSearch] = useState('');

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
    setPage(1);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  return {
    page,
    limit,
    sortBy,
    sortOrder,
    search,
    setPage,
    handleSort,
    handleSearch,
    queryParams: {
      page,
      limit,
      sort_by: sortBy,
      sort_order: sortOrder,
      search: search || undefined,
    },
  };
}
