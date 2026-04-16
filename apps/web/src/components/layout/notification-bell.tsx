'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useUnreadCount } from '@/hooks/use-notifications';

export function NotificationBell({ locale }: { locale: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const unreadCount = useUnreadCount();
  const [open, setOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ['recent-notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications', { params: { limit: 5 } });
      return res.data?.data || [];
    },
    enabled: open,
  });

  const markAllRead = useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      queryClient.invalidateQueries({ queryKey: ['recent-notifications'] });
    },
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-2 hover:bg-accent"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-full z-50 mt-2 w-80 rounded-lg border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Check className="h-3 w-3" />
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {(!notifications || notifications.length === 0) ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No notifications
                </p>
              ) : (
                notifications.map((n: any) => (
                  <div
                    key={n.id}
                    className={`border-b px-4 py-3 text-sm hover:bg-muted/50 cursor-pointer ${
                      !n.is_read ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => {
                      setOpen(false);
                      // Navigate based on notification type/metadata
                      if (n.metadata?.contract_id) {
                        router.push(`/${locale}/contracts/${n.metadata.contract_id}`);
                      } else if (n.metadata?.payment_id) {
                        router.push(`/${locale}/payments/${n.metadata.payment_id}`);
                      } else if (n.metadata?.maintenance_request_id) {
                        router.push(`/${locale}/maintenance/${n.metadata.maintenance_request_id}`);
                      }
                    }}
                  >
                    <p className={`font-medium ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {locale === 'ar' ? n.title_ar : n.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {locale === 'ar' ? n.body_ar : n.body}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-AE')}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="border-t px-4 py-2">
              <button
                onClick={() => {
                  setOpen(false);
                  router.push(`/${locale}/notifications`);
                }}
                className="w-full text-center text-xs text-primary hover:underline"
              >
                View all notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
