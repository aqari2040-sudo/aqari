'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export function useUnreadCount() {
  const { data } = useQuery({
    queryKey: ['unread-notifications-count'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications/unread-count');
      return res.data?.count || 0;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });

  return data || 0;
}
