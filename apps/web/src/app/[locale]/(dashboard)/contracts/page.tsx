'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Plus, Scan } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/shared/data-table';
import { SearchInput } from '@/components/shared/search-input';
import { StatusBadge } from '@/components/shared/status-badge';
import { CurrencyDisplay } from '@/components/shared/currency-display';
import { usePagination } from '@/hooks/use-pagination';
import { formatDate } from '@aqari/shared';

export default function ContractsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('contracts');
  const tc = useTranslations('common');
  const router = useRouter();
  const { page, limit, sortBy, sortOrder, setPage, handleSort, queryParams } = usePagination();
  const [statusFilter, setStatusFilter] = useState('');
  const [expiringDays, setExpiringDays] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['contracts', queryParams, statusFilter, expiringDays],
    queryFn: async () => {
      const params: Record<string, any> = { ...queryParams };
      if (statusFilter) params.status = statusFilter;
      if (expiringDays) params.expiring_within_days = Number(expiringDays);
      const res = await apiClient.get('/contracts', { params });
      return res.data;
    },
  });

  const columns: Column<any>[] = [
    {
      key: 'tenant',
      header: 'Tenant',
      render: (item) => (
        <div className="font-medium">
          {locale === 'ar' ? item.tenant?.full_name_ar : item.tenant?.full_name}
        </div>
      ),
    },
    {
      key: 'unit',
      header: 'Unit',
      render: (item) => item.unit?.unit_number || '—',
    },
    {
      key: 'rent_amount',
      header: t('rent_amount'),
      sortable: true,
      render: (item) => <CurrencyDisplay amount={Number(item.rent_amount)} locale={locale as 'en' | 'ar'} />,
    },
    {
      key: 'payment_frequency',
      header: t('frequency'),
      render: (item) => <span className="capitalize">{item.payment_frequency}</span>,
    },
    {
      key: 'start_date',
      header: t('start_date'),
      sortable: true,
      render: (item) => formatDate(item.start_date, locale as 'en' | 'ar'),
    },
    {
      key: 'end_date',
      header: t('end_date'),
      sortable: true,
      render: (item) => {
        const endDate = new Date(item.end_date);
        const now = new Date();
        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return (
          <div>
            <span>{formatDate(item.end_date, locale as 'en' | 'ar')}</span>
            {daysLeft <= 30 && daysLeft > 0 && item.status === 'active' && (
              <span className="ms-2 text-xs text-yellow-600">({daysLeft}d left)</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: tc('status'),
      render: (item) => <StatusBadge status={item.status} locale={locale} />,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/${locale}/contracts/scan`)}>
            <Scan className="me-2 h-4 w-4" />
            {locale === 'ar' ? 'مسح بالذكاء الاصطناعي' : 'Scan with AI'}
          </Button>
          <Button onClick={() => router.push(`/${locale}/contracts/new`)}>
            <Plus className="me-2 h-4 w-4" />
            {t('add')}
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">{tc('filter')}: {tc('status')}</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="terminated">Terminated</option>
        </select>
        <select
          value={expiringDays}
          onChange={(e) => { setExpiringDays(e.target.value); setPage(1); }}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">{t('expiring_soon')}</option>
          <option value="7">Within 7 days</option>
          <option value="30">Within 30 days</option>
          <option value="60">Within 60 days</option>
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
        onRowClick={(item) => router.push(`/${locale}/contracts/${item.id}`)}
      />
    </div>
  );
}
