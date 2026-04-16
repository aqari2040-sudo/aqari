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
import { StatusBadge } from '@/components/shared/status-badge';
import { CurrencyDisplay } from '@/components/shared/currency-display';
import { usePagination } from '@/hooks/use-pagination';

export default function UnitsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('units');
  const tc = useTranslations('common');
  const router = useRouter();
  const { page, limit, sortBy, sortOrder, setPage, handleSort, handleSearch, queryParams } = usePagination();
  const [statusFilter, setStatusFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');

  const { data: propertiesList } = useQuery({
    queryKey: ['properties-list'],
    queryFn: async () => {
      const res = await apiClient.get('/properties', { params: { limit: 100 } });
      return res.data?.data || [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['units', queryParams, statusFilter, propertyFilter],
    queryFn: async () => {
      const params: Record<string, any> = { ...queryParams };
      if (statusFilter) params.status = statusFilter;
      if (propertyFilter) params.property_id = propertyFilter;
      const res = await apiClient.get('/units', { params });
      return res.data;
    },
  });

  const columns: Column<any>[] = [
    {
      key: 'unit_number',
      header: t('unit_number'),
      sortable: true,
      render: (item) => <span className="font-medium">{item.unit_number}</span>,
    },
    {
      key: 'property',
      header: 'Property',
      render: (item) => locale === 'ar' ? item.property?.name_ar : item.property?.name,
    },
    {
      key: 'status',
      header: tc('status'),
      render: (item) => <StatusBadge status={item.status} locale={locale} />,
    },
    {
      key: 'base_rent',
      header: t('base_rent'),
      sortable: true,
      render: (item) => <CurrencyDisplay amount={Number(item.base_rent)} locale={locale as 'en' | 'ar'} />,
    },
    { key: 'bedrooms', header: t('bedrooms') },
    { key: 'bathrooms', header: t('bathrooms') },
    {
      key: 'size_sqft',
      header: t('size'),
      render: (item) => `${Number(item.size_sqft).toLocaleString()} sqft`,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button onClick={() => router.push(`/${locale}/units/new`)}>
          <Plus className="me-2 h-4 w-4" />
          {t('add')}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-72">
          <SearchInput onSearch={handleSearch} />
        </div>
        <select
          value={propertyFilter}
          onChange={(e) => { setPropertyFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All Properties</option>
          {(propertiesList || []).map((p: any) => (
            <option key={p.id} value={p.id}>
              {locale === 'ar' ? p.name_ar : p.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">{tc('filter')}: {tc('status')}</option>
          <option value="occupied">Occupied</option>
          <option value="vacant">Vacant</option>
          <option value="under_maintenance">Under Maintenance</option>
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
        onRowClick={(item) => router.push(`/${locale}/units/${item.id}`)}
      />
    </div>
  );
}
