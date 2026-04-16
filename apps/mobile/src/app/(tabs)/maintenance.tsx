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

interface MaintenanceRequest {
  id: string;
  unit_number?: string;
  category: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string;
  created_at: string;
}

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: '#f0fdf4', text: '#16a34a', label: 'Low' },
  medium: { bg: '#fef9c3', text: '#ca8a04', label: 'Medium' },
  high: { bg: '#fff7ed', text: '#ea580c', label: 'High' },
  urgent: { bg: '#fee2e2', text: '#dc2626', label: 'Urgent' },
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' });
};

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? { bg: '#e5e7eb', text: '#374151', label: priority };
  return (
    <View style={[styles.priorityBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.priorityText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

function MaintenanceItem({ item }: { item: MaintenanceRequest }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(`/maintenance/${item.id}`)}
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.category}>{item.category}</Text>
            {item.unit_number ? (
              <Text style={styles.unitNumber}>Unit {item.unit_number}</Text>
            ) : null}
          </View>
          <View style={styles.badgesCol}>
            <PriorityBadge priority={item.priority} />
            <View style={{ marginTop: 4 }}>
              <StatusBadge status={item.status} />
            </View>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>

        <Text style={styles.date}>{formatDate(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MaintenanceScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery<MaintenanceRequest[]>({
    queryKey: ['maintenance-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/maintenance');
      return res.data;
    },
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const sorted = [...(data ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
        renderItem={({ item }) => <MaintenanceItem item={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#2563EB" />
        }
        ListEmptyComponent={
          <EmptyState message="No maintenance requests found. Tap + to submit one." />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/maintenance/new-request')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabLabel}>New Request</Text>
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
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: { flex: 1, marginRight: 8 },
  category: { fontSize: 15, fontWeight: '700', color: '#111827' },
  unitNumber: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  badgesCol: { alignItems: 'flex-end' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  priorityText: { fontSize: 11, fontWeight: '600' },

  description: { fontSize: 13, color: '#374151', lineHeight: 18, marginBottom: 8 },
  date: { fontSize: 11, color: '#9ca3af' },

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
