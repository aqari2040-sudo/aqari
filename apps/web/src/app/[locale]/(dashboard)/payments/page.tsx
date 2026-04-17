'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Upload, Scan } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { formatDate } from '@aqari/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { CurrencyDisplay } from '@/components/shared/currency-display';
import { usePagination } from '@/hooks/use-pagination';

export default function PaymentsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('payments');
  const tc = useTranslations('common');
  const router = useRouter();
  const { page, limit, sortBy, sortOrder, setPage, handleSort, queryParams } = usePagination();
  const [statusFilter, setStatusFilter] = useState('');
  const [tab, setTab] = useState<'all' | 'pending' | 'overdue'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['payments', queryParams, statusFilter, tab],
    queryFn: async () => {
      if (tab === 'overdue') {
        const res = await apiClient.get('/payments/overdue', { params: queryParams });
        return res.data;
      }
      const params: Record<string, any> = { ...queryParams };
      if (tab === 'pending') params.status = 'pending_review';
      else if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get('/payments', { params });
      return res.data;
    },
  });

  const paymentColumns: Column<any>[] = [
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
      key: 'amount',
      header: tc('amount'),
      sortable: true,
      render: (item) => <CurrencyDisplay amount={Number(item.amount)} locale={locale as 'en' | 'ar'} />,
    },
    {
      key: 'payment_date',
      header: tc('date'),
      sortable: true,
      render: (item) => formatDate(item.payment_date || item.due_date, locale as 'en' | 'ar'),
    },
    {
      key: 'ocr_confidence',
      header: 'OCR',
      render: (item) => {
        if (item.ocr_confidence == null) return <span className="text-muted-foreground">—</span>;
        const pct = Math.round(Number(item.ocr_confidence) * 100);
        return (
          <Badge variant={item.ocr_flagged ? 'warning' : pct >= 85 ? 'success' : 'secondary'}>
            {pct}%
          </Badge>
        );
      },
    },
    {
      key: 'status',
      header: tc('status'),
      render: (item) => <StatusBadge status={item.status} locale={locale} />,
    },
  ];

  const overdueColumns: Column<any>[] = [
    {
      key: 'tenant',
      header: 'Tenant',
      render: (item) => item.contract?.tenant?.full_name || '—',
    },
    {
      key: 'unit',
      header: 'Unit',
      render: (item) => item.contract?.unit?.unit_number || '—',
    },
    {
      key: 'due_date',
      header: 'Due Date',
      render: (item) => formatDate(item.due_date, locale as 'en' | 'ar'),
    },
    {
      key: 'amount_due',
      header: t('amount_due'),
      render: (item) => <CurrencyDisplay amount={Number(item.amount_due)} locale={locale as 'en' | 'ar'} />,
    },
    {
      key: 'amount_paid',
      header: t('amount_paid'),
      render: (item) => <CurrencyDisplay amount={Number(item.amount_paid)} locale={locale as 'en' | 'ar'} />,
    },
    {
      key: 'status',
      header: tc('status'),
      render: () => <StatusBadge status="overdue" locale={locale} />,
    },
  ];

  const tabs = [
    { key: 'all' as const, label: t('title'), count: null },
    { key: 'pending' as const, label: t('pending_review'), count: null },
    { key: 'overdue' as const, label: 'Overdue', count: null },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/${locale}/payments/scan`)}>
            <Scan className="me-2 h-4 w-4" />
            {locale === 'ar' ? 'مسح بالذكاء الاصطناعي' : 'Scan with AI'}
          </Button>
          <Button onClick={() => router.push(`/${locale}/payments/upload`)}>
            <Upload className="me-2 h-4 w-4" />
            {t('upload_receipt')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex border-b">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => { setTab(tabItem.key); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === tabItem.key
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab !== 'overdue' && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {tab === 'all' && (
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">{tc('filter')}: {tc('status')}</option>
              <option value="pending_review">Pending Review</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
            </select>
          )}
        </div>
      )}

      <DataTable
        columns={tab === 'overdue' ? overdueColumns : paymentColumns}
        data={data?.data || []}
        total={data?.meta?.total || 0}
        page={page}
        limit={limit}
        sortBy={sortBy}
        sortOrder={sortOrder}
        loading={isLoading}
        onPageChange={setPage}
        onSort={handleSort}
        onRowClick={tab !== 'overdue' ? (item) => router.push(`/${locale}/payments/${item.id}`) : undefined}
      />
    </div>
  );
}
