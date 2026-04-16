import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { Card, CardTitle, CardValue, CardLabel } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';

interface PaymentSchedule {
  id: string;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  remaining: number;
  status: string;
}

interface MaintenanceRequest {
  id: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  unit_number?: string;
}

interface ActivityItem {
  id: string;
  type: 'payment' | 'maintenance';
  title: string;
  subtitle: string;
  status: string;
  date: string;
}

const formatCurrency = (amount: number) =>
  `AED ${Number(amount).toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function HomeScreen() {
  const { user } = useAuthStore();

  const {
    data: schedules,
    isLoading: schedulesLoading,
    refetch: refetchSchedules,
  } = useQuery<PaymentSchedule[]>({
    queryKey: ['payment-schedules'],
    queryFn: async () => {
      const res = await apiClient.get('/payments/schedules');
      return res.data;
    },
  });

  const {
    data: maintenanceRequests,
    isLoading: maintenanceLoading,
    refetch: refetchMaintenance,
  } = useQuery<MaintenanceRequest[]>({
    queryKey: ['maintenance-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/maintenance');
      return res.data;
    },
  });

  const isRefreshing = schedulesLoading || maintenanceLoading;

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchSchedules(), refetchMaintenance()]);
  }, [refetchSchedules, refetchMaintenance]);

  const nextPayment = schedules
    ?.filter((s) => s.status === 'pending' || s.status === 'partial' || s.status === 'overdue')
    ?.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

  const recentActivity: ActivityItem[] = [
    ...(schedules ?? []).map<ActivityItem>((s) => ({
      id: s.id,
      type: 'payment',
      title: `Payment — ${formatCurrency(s.amount_due)}`,
      subtitle: `Due ${formatDate(s.due_date)}`,
      status: s.status,
      date: s.due_date,
    })),
    ...(maintenanceRequests ?? []).map<ActivityItem>((m) => ({
      id: m.id,
      type: 'maintenance',
      title: `Maintenance — ${m.category}`,
      subtitle: m.description?.slice(0, 60) ?? '',
      status: m.status,
      date: m.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      {/* Welcome Header */}
      <View style={styles.welcomeRow}>
        <View>
          <Text style={styles.welcomeLabel}>Welcome back,</Text>
          <Text style={styles.welcomeName}>{user?.name ?? user?.email ?? 'Tenant'}</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {(user?.name ?? user?.email ?? 'T').charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Next Payment Card */}
      <Text style={styles.sectionTitle}>Next Payment Due</Text>
      {schedulesLoading ? (
        <ActivityIndicator color="#2563EB" style={{ marginVertical: 16 }} />
      ) : nextPayment ? (
        <Card
          style={styles.paymentCard}
          onPress={() => router.push(`/payments/${nextPayment.id}`)}
        >
          <View style={styles.paymentCardHeader}>
            <CardTitle>Amount Due</CardTitle>
            <StatusBadge status={nextPayment.status} />
          </View>
          <CardValue>{formatCurrency(nextPayment.amount_due)}</CardValue>
          <View style={styles.paymentMeta}>
            <View style={styles.metaItem}>
              <CardLabel>Due Date</CardLabel>
              <Text style={styles.metaValue}>{formatDate(nextPayment.due_date)}</Text>
            </View>
            <View style={styles.metaItem}>
              <CardLabel>Paid</CardLabel>
              <Text style={[styles.metaValue, { color: '#16a34a' }]}>
                {formatCurrency(nextPayment.amount_paid)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <CardLabel>Remaining</CardLabel>
              <Text style={[styles.metaValue, { color: '#dc2626' }]}>
                {formatCurrency(nextPayment.remaining)}
              </Text>
            </View>
          </View>
        </Card>
      ) : (
        <Card style={styles.paymentCard}>
          <Text style={styles.allClearText}>No pending payments — you are all caught up!</Text>
        </Card>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/payments/upload-receipt')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
            <Text style={styles.actionIconText}>📄</Text>
          </View>
          <Text style={styles.actionLabel}>Upload{'\n'}Receipt</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/maintenance/new-request')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#dcfce7' }]}>
            <Text style={styles.actionIconText}>🔧</Text>
          </View>
          <Text style={styles.actionLabel}>Request{'\n'}Maintenance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/contract')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#fef9c3' }]}>
            <Text style={styles.actionIconText}>📋</Text>
          </View>
          <Text style={styles.actionLabel}>My{'\n'}Contract</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {recentActivity.length === 0 ? (
        <Card>
          <Text style={styles.allClearText}>No recent activity yet.</Text>
        </Card>
      ) : (
        recentActivity.map((item) => (
          <TouchableOpacity
            key={`${item.type}-${item.id}`}
            activeOpacity={0.7}
            onPress={() =>
              item.type === 'payment'
                ? router.push(`/payments/${item.id}`)
                : router.push(`/maintenance/${item.id}`)
            }
          >
            <Card style={styles.activityCard}>
              <View style={styles.activityRow}>
                <View style={styles.activityIconBox}>
                  <Text style={styles.activityIconText}>
                    {item.type === 'payment' ? '💳' : '🔧'}
                  </Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>{item.title}</Text>
                  <Text style={styles.activitySubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                  <Text style={styles.activityDate}>{formatDate(item.date)}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 32 },

  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeLabel: { fontSize: 14, color: '#6b7280' },
  welcomeName: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 2 },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
    marginTop: 8,
  },

  paymentCard: { marginBottom: 16 },
  paymentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentMeta: { flexDirection: 'row', marginTop: 12, gap: 8 },
  metaItem: { flex: 1 },
  metaValue: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 2 },
  allClearText: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingVertical: 8 },

  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionButton: { flex: 1, alignItems: 'center' },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionIconText: { fontSize: 26 },
  actionLabel: { fontSize: 12, color: '#374151', textAlign: 'center', fontWeight: '500' },

  activityCard: { marginBottom: 8, padding: 12 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activityIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconText: { fontSize: 18 },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  activitySubtitle: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  activityDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
});
