'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/shared/spinner';
import { usePagination } from '@/hooks/use-pagination';

const typeIcons: Record<string, string> = {
  overdue_rent: 'Overdue',
  contract_expiry: 'Contract',
  maintenance_update: 'Maintenance',
  cost_pending: 'Cost',
  cost_approved: 'Approved',
  cost_rejected: 'Rejected',
  receipt_confirmed: 'Receipt',
  receipt_rejected: 'Receipt',
  suspicious_cost: 'Alert',
  recurring_maintenance: 'Alert',
  budget_exceeded: 'Budget',
};

export default function NotificationsPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { page, limit, setPage, queryParams } = usePagination();
  const [typeFilter, setTypeFilter] = useState('');
  const [readFilter, setReadFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', queryParams, typeFilter, readFilter],
    queryFn: async () => {
      const params: Record<string, any> = { ...queryParams };
      if (typeFilter) params.type = typeFilter;
      if (readFilter) params.is_read = readFilter === 'read';
      const res = await apiClient.get('/notifications', { params });
      return res.data;
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });

  const handleClick = (n: any) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.metadata?.contract_id) router.push(`/${locale}/contracts/${n.metadata.contract_id}`);
    else if (n.metadata?.payment_id) router.push(`/${locale}/payments/${n.metadata.payment_id}`);
    else if (n.metadata?.maintenance_request_id) router.push(`/${locale}/maintenance/${n.metadata.maintenance_request_id}`);
  };

  const notifications = data?.data || [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Notifications</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
          <Check className="me-2 h-3.5 w-3.5" />
          Mark all read
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={readFilter}
          onChange={(e) => { setReadFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All types</option>
          <option value="overdue_rent">Overdue Rent</option>
          <option value="contract_expiry">Contract Expiry</option>
          <option value="maintenance_update">Maintenance</option>
          <option value="suspicious_cost">Suspicious Cost</option>
          <option value="budget_exceeded">Budget Exceeded</option>
        </select>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : notifications.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No notifications</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                !n.is_read ? 'border-primary/30 bg-primary/5' : ''
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${!n.is_read ? '' : 'text-muted-foreground'}`}>
                    {locale === 'ar' ? n.title_ar : n.title}
                  </p>
                  <Badge variant="secondary" className="text-[10px]">
                    {typeIcons[n.type] || n.type}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {locale === 'ar' ? n.body_ar : n.body}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-AE')}
                </p>
              </div>
              {!n.is_read && (
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(data?.meta?.total_pages || 0) > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center text-sm">
            {page} / {data.meta.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.meta.total_pages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
