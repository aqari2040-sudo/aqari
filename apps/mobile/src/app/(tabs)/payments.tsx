import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';

interface PaymentSchedule {
  id: string;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  remaining: number;
  status: string;
  billing_period?: string;
}

const formatCurrency = (amount: number) =>
  `AED ${Number(amount).toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' });
};

function PaymentItem({ item }: { item: PaymentSchedule }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(`/payments/${item.id}`)}
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.dueLabel}>Due Date</Text>
            <Text style={styles.dueDate}>{formatDate(item.due_date)}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.amountsRow}>
          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Amount Due</Text>
            <Text style={styles.amountValue}>{formatCurrency(item.amount_due)}</Text>
          </View>
          <View style={styles.amountDivider} />
          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Paid</Text>
            <Text style={[styles.amountValue, { color: '#16a34a' }]}>
              {formatCurrency(item.amount_paid)}
            </Text>
          </View>
          <View style={styles.amountDivider} />
          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Remaining</Text>
            <Text
              style={[
                styles.amountValue,
                { color: item.remaining > 0 ? '#dc2626' : '#16a34a' },
              ]}
            >
              {formatCurrency(item.remaining)}
            </Text>
          </View>
        </View>

        {item.billing_period ? (
          <Text style={styles.billingPeriod}>Period: {item.billing_period}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function PaymentsScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery<PaymentSchedule[]>({
    queryKey: ['payment-schedules'],
    queryFn: async () => {
      const res = await apiClient.get('/payments/schedules');
      return res.data;
    },
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const sorted = [...(data ?? [])].sort(
    (a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PaymentItem item={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#2563EB" />
        }
        ListEmptyComponent={<EmptyState message="No payment schedules found." />}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/payments/upload-receipt')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabLabel}>Upload Receipt</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 96 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  dueLabel: { fontSize: 12, color: '#6b7280' },
  dueDate: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 2 },

  amountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
  },
  amountBlock: { flex: 1, alignItems: 'center' },
  amountLabel: { fontSize: 11, color: '#6b7280', marginBottom: 3 },
  amountValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  amountDivider: { width: 1, height: 32, backgroundColor: '#e5e7eb' },
  billingPeriod: { fontSize: 12, color: '#6b7280', marginTop: 10 },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#2563EB',
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    gap: 8,
  },
  fabIcon: { fontSize: 22, color: '#fff', fontWeight: '700', lineHeight: 24 },
  fabLabel: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
