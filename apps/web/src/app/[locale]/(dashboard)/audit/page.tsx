'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/shared/data-table';
import { usePagination } from '@/hooks/use-pagination';

const actionColors: Record<string, 'success' | 'warning' | 'destructive'> = {
  create: 'success',
  update: 'warning',
  delete: 'destructive',
};

export default function AuditPage({ params: { locale } }: { params: { locale: string } }) {
  const { page, limit, setPage, queryParams } = usePagination({ initialSortBy: 'created_at', initialSortOrder: 'desc' });
  const [tableFilter, setTableFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', queryParams, tableFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, any> = { ...queryParams };
      if (tableFilter) params.table_name = tableFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const res = await apiClient.get('/audit-logs', { params });
      return res.data;
    },
  });

  const columns: Column<any>[] = [
    {
      key: 'created_at',
      header: 'Timestamp',
      render: (item) => (
        <span className="text-xs">
          {new Date(item.created_at).toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-AE')}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (item) => (
        <Badge variant={actionColors[item.action] || 'outline'} className="capitalize">
          {item.action}
        </Badge>
      ),
    },
    {
      key: 'table_name',
      header: 'Table',
      render: (item) => <span className="font-mono text-xs">{item.table_name}</span>,
    },
    {
      key: 'record_id',
      header: 'Record ID',
      render: (item) => <span className="font-mono text-xs">{item.record_id?.slice(0, 8)}...</span>,
    },
    {
      key: 'user_id',
      header: 'User',
      render: (item) => <span className="font-mono text-xs">{item.user_id?.slice(0, 8)}...</span>,
    },
    {
      key: 'changes',
      header: 'Changes',
      render: (item) => {
        if (item.action === 'create') return <span className="text-xs text-green-600">New record</span>;
        if (item.action === 'delete') return <span className="text-xs text-red-600">Record deleted</span>;
        const changed = item.new_values ? Object.keys(item.new_values).length : 0;
        return <span className="text-xs">{changed} fields changed</span>;
      },
    },
  ];

  const tables = [
    'properties', 'units', 'tenants', 'contracts',
    'payments', 'maintenance_requests', 'maintenance_costs', 'settings',
  ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Audit Log</h1>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={tableFilter}
          onChange={(e) => { setTableFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All Tables</option>
          {tables.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-40"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-40"
          placeholder="To"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        total={data?.meta?.total || 0}
        page={page}
        limit={limit}
        loading={isLoading}
        onPageChange={setPage}
      />
    </div>
  );
}
