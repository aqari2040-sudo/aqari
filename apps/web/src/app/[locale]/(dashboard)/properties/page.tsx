'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/shared/data-table';
import { SearchInput } from '@/components/shared/search-input';
import { usePagination } from '@/hooks/use-pagination';

export default function PropertiesPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('properties');
  const tc = useTranslations('common');
  const router = useRouter();
  const { page, limit, sortBy, sortOrder, setPage, handleSort, handleSearch, queryParams } = usePagination();
  const [typeFilter, setTypeFilter] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['properties', queryParams, typeFilter],
    queryFn: async () => {
      const params: Record<string, any> = { ...queryParams };
      if (typeFilter) params.type = typeFilter;
      const res = await apiClient.get('/properties', { params });
      return res.data;
    },
  });

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: t('name'),
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-medium">{locale === 'ar' ? item.name_ar : item.name}</div>
          <div className="text-xs text-muted-foreground">{locale === 'ar' ? item.name : item.name_ar}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: t('type'),
      render: (item) => (
        <span className="capitalize">{item.type === 'tower' ? t('tower') : t('house_group')}</span>
      ),
    },
    {
      key: 'address',
      header: t('address'),
      render: (item) => locale === 'ar' ? item.address_ar : item.address,
    },
    {
      key: 'unit_count',
      header: t('unit_count'),
      sortable: true,
      render: (item) => (
        <span className="font-medium">{item._count?.units ?? item.unit_count ?? 0}</span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button onClick={() => router.push(`/${locale}/properties/new`)}>
          <Plus className="me-2 h-4 w-4" />
          {t('add')}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-72">
          <SearchInput onSearch={handleSearch} />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">{tc('filter')}: {t('type')}</option>
          <option value="tower">{t('tower')}</option>
          <option value="house_group">{t('house_group')}</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        total={data?.meta?.total || 0}
        page={page}
        limit={limit}
        sortBy={sortBy}
        sortOrder={sortOrder}
        loading={isLoading}
        onPageChange={setPage}
        onSort={handleSort}
        onRowClick={(item) => router.push(`/${locale}/properties/${item.id}`)}
      />
    </div>
  );
}
