'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Plus, AlertTriangle } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { formatDate } from '@aqari/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/shared/data-table';
import { SearchInput } from '@/components/shared/search-input';
import { StatusBadge } from '@/components/shared/status-badge';
import { CurrencyDisplay } from '@/components/shared/currency-display';
import { usePagination } from '@/hooks/use-pagination';

export default function MaintenancePage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('maintenance');
  const tc = useTranslations('common');
  const router = useRouter();
  const { page, limit, sortBy, sortOrder, setPage, handleSort, queryParams } = usePagination();
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [tab, setTab] = useState<'requests' | 'approvals' | 'alerts'>('requests');

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', queryParams, statusFilter, priorityFilter, tab],
    queryFn: async () => {
      if (tab === 'alerts') {
        const res = await apiClient.get('/maintenance/recurring-alerts');
        return { data: res.data, meta: { total: res.data?.length || 0 } };
      }
      const params: Record<string, any> = { ...queryParams };
      if (tab === 'approvals') {
        // Show requests with pending costs
        params.status = 'pending_approval';
      } else {
        if (statusFilter) params.status = statusFilter;
      }
      if (priorityFilter) params.priority = priorityFilter;
      const res = await apiClient.get('/maintenance', { params });
      return res.data;
    },
  });

  const requestColumns: Column<any>[] = [
    {
      key: 'unit',
      header: 'Unit',
      render: (item) => (
        <span className="font-medium">{item.unit?.unit_number || '—'}</span>
      ),
    },
    {
      key: 'category',
      header: t('category'),
      render: (item) => locale === 'ar' ? item.category?.name_ar : item.category?.name,
    },
    {
      key: 'description',
      header: tc('description'),
      className: 'max-w-[200px]',
      render: (item) => (
        <p className="truncate text-sm">{item.description}</p>
      ),
    },
    {
      key: 'priority',
      header: t('priority'),
      render: (item) => {
        const colors: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
          low: 'secondary',
          medium: 'default',
          high: 'warning',
          urgent: 'destructive',
        };
        return (
          <Badge variant={colors[item.priority] || 'default'} className="capitalize">
            {t(item.priority)}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      header: tc('status'),
      render: (item) => <StatusBadge status={item.status} locale={locale} />,
    },
    {
      key: 'created_at',
      header: tc('date'),
      sortable: true,
      render: (item) => formatDate(item.created_at, locale as 'en' | 'ar'),
    },
    {
      key: 'total_cost',
      header: 'Cost',
      render: (item) => {
        const total = (item.maintenance_costs || [])
          .filter((c: any) => c.status === 'approved')
          .reduce((sum: number, c: any) => sum + Number(c.amount), 0);
        return total > 0
          ? <CurrencyDisplay amount={total} locale={locale as 'en' | 'ar'} />
          : <span className="text-muted-foreground">—</span>;
      },
    },
  ];

  const alertColumns: Column<any>[] = [
    {
      key: 'unit_number',
      header: 'Unit',
      render: (item) => <span className="font-medium">{item.unit_number}</span>,
    },
    {
      key: 'property_name',
      header: 'Property',
      render: (item) => item.property_name || '—',
    },
    {
      key: 'request_count',
      header: 'Requests',
      render: (item) => (
        <Badge variant="destructive">{item.request_count} requests</Badge>
      ),
    },
    {
      key: 'period_days',
      header: 'Period',
      render: (item) => `Last ${item.period_days} days`,
    },
  ];

  const tabs = [
    { key: 'requests' as const, label: t('title') },
    { key: 'approvals' as const, label: 'Cost Approvals' },
    { key: 'alerts' as const, label: 'Recurring Alerts' },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button onClick={() => router.push(`/${locale}/maintenance/new`)}>
          <Plus className="me-2 h-4 w-4" />
          {t('add_request')}
        </Button>
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

      {/* Filters (only for requests tab) */}
      {tab === 'requests' && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">{tc('filter')}: {tc('status')}</option>
            <option value="submitted">Submitted</option>
            <option value="blocked_duplicate">Blocked (Duplicate)</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">{tc('filter')}: {t('priority')}</option>
            <option value="low">{t('low')}</option>
            <option value="medium">{t('medium')}</option>
            <option value="high">{t('high')}</option>
            <option value="urgent">{t('urgent')}</option>
          </select>
        </div>
      )}

      <DataTable
        columns={tab === 'alerts' ? alertColumns : requestColumns}
        data={data?.data || []}
        total={data?.meta?.total || 0}
        page={page}
        limit={limit}
        sortBy={sortBy}
        sortOrder={sortOrder}
        loading={isLoading}
        onPageChange={setPage}
        onSort={handleSort}
        onRowClick={tab !== 'alerts'
          ? (item) => router.push(`/${locale}/maintenance/${item.id}`)
          : (item) => router.push(`/${locale}/units/${item.unit_id}`)
        }
      />
    </div>
  );
}
