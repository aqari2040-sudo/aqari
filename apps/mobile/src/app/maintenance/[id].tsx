import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Card, CardLabel } from '../../components/ui/Card';

interface MaintenanceCost {
  id: string;
  description: string;
  amount: number;
  created_at: string;
}

interface StatusEvent {
  status: string;
  note?: string;
  created_at: string;
  updated_by?: string;
}

interface MaintenanceDetail {
  id: string;
  category: string;
  unit_number?: string;
  unit_id?: string;
  priority: string;
  status: string;
  description: string;
  photo_urls?: string[];
  costs?: MaintenanceCost[];
  status_history?: StatusEvent[];
  created_at: string;
  updated_at?: string;
  assigned_to?: string;
}

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: '#f0fdf4', text: '#16a34a', label: 'Low' },
  medium: { bg: '#fef9c3', text: '#ca8a04', label: 'Medium' },
  high: { bg: '#fff7ed', text: '#ea580c', label: 'High' },
  urgent: { bg: '#fee2e2', text: '#dc2626', label: 'Urgent' },
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatCurrency = (amount: number) =>
  `AED ${Number(amount).toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleString('en-AE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? { bg: '#e5e7eb', text: '#374151', label: priority };
  return (
    <View style={[styles.priorityBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.priorityText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const STATUS_TIMELINE_ORDER = [
  'submitted',
  'pending',
  'in_progress',
  'completed',
  'closed',
];

export default function MaintenanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: request, isLoading } = useQuery<MaintenanceDetail>({
    queryKey: ['maintenance-detail', id],
    queryFn: async () => {
      const res = await apiClient.get(`/maintenance/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Request not found.</Text>
      </View>
    );
  }

  const totalCost = (request.costs ?? []).reduce((sum, c) => sum + c.amount, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>{request.category}</Text>
          {request.unit_number ? (
            <Text style={styles.subheading}>Unit {request.unit_number}</Text>
          ) : null}
          <Text style={styles.dateText}>Submitted {formatDate(request.created_at)}</Text>
        </View>
        <View style={styles.badgesCol}>
          <PriorityBadge priority={request.priority} />
          <View style={{ marginTop: 6 }}>
            <StatusBadge status={request.status} />
          </View>
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Card>
          <Text style={styles.descriptionText}>{request.description}</Text>
        </Card>
      </View>

      {/* Photos Gallery */}
      {request.photo_urls && request.photo_urls.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Photos ({request.photo_urls.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.photosRow}>
              {request.photo_urls.map((url, index) => (
                <Image
                  key={index}
                  source={{ uri: url }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              ))}
            </View>
          </ScrollView>
        </View>
      ) : null}

      {/* Costs */}
      {request.costs && request.costs.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Associated Costs</Text>
          <Card>
            {request.costs.map((cost, index) => (
              <View
                key={cost.id}
                style={[styles.costRow, index < request.costs!.length - 1 && styles.costDivider]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.costDescription}>{cost.description}</Text>
                  <Text style={styles.costDate}>{formatDate(cost.created_at)}</Text>
                </View>
                <Text style={styles.costAmount}>{formatCurrency(cost.amount)}</Text>
              </View>
            ))}
            {request.costs.length > 1 ? (
              <View style={styles.costTotalRow}>
                <Text style={styles.costTotalLabel}>Total</Text>
                <Text style={styles.costTotalValue}>{formatCurrency(totalCost)}</Text>
              </View>
            ) : null}
          </Card>
        </View>
      ) : null}

      {/* Status Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status Timeline</Text>
        <View style={styles.timeline}>
          {request.status_history && request.status_history.length > 0 ? (
            request.status_history.map((event, index) => {
              const isLast = index === request.status_history!.length - 1;
              return (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.timelineDot,
                        isLast && styles.timelineDotActive,
                      ]}
                    />
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineHeader}>
                      <StatusBadge status={event.status} />
                      <Text style={styles.timelineDate}>
                        {formatDateTime(event.created_at)}
                      </Text>
                    </View>
                    {event.note ? (
                      <Text style={styles.timelineNote}>{event.note}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          ) : (
            /* Fallback: show current status only */
            <View style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, styles.timelineDotActive]} />
              </View>
              <View style={styles.timelineContent}>
                <View style={styles.timelineHeader}>
                  <StatusBadge status={request.status} />
                  <Text style={styles.timelineDate}>{formatDateTime(request.created_at)}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Assignment info */}
      {request.assigned_to ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assigned To</Text>
          <Card>
            <View style={styles.assignedRow}>
              <View style={styles.assignedAvatar}>
                <Text style={styles.assignedAvatarText}>
                  {request.assigned_to.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.assignedName}>{request.assigned_to}</Text>
            </View>
          </Card>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 14, color: '#6b7280' },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subheading: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  dateText: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  badgesCol: { alignItems: 'flex-end' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  priorityText: { fontSize: 11, fontWeight: '600' },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },

  descriptionText: { fontSize: 14, color: '#374151', lineHeight: 22 },

  photosRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  photo: {
    width: SCREEN_WIDTH * 0.65,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },

  costRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  costDivider: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  costDescription: { fontSize: 14, color: '#111827', fontWeight: '500' },
  costDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  costAmount: { fontSize: 15, fontWeight: '700', color: '#111827' },
  costTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 4,
  },
  costTotalLabel: { fontSize: 14, fontWeight: '700', color: '#374151' },
  costTotalValue: { fontSize: 16, fontWeight: '700', color: '#2563EB' },

  timeline: { paddingLeft: 4 },
  timelineItem: { flexDirection: 'row', marginBottom: 16 },
  timelineLeft: { width: 24, alignItems: 'center' },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#d1d5db',
    marginTop: 3,
  },
  timelineDotActive: { backgroundColor: '#2563EB' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#e5e7eb', marginTop: 4, marginBottom: -4 },
  timelineContent: { flex: 1, paddingLeft: 10 },
  timelineHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  timelineDate: { fontSize: 11, color: '#9ca3af' },
  timelineNote: { fontSize: 13, color: '#6b7280', marginTop: 4, lineHeight: 18 },

  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  assignedAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignedAvatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  assignedName: { fontSize: 14, fontWeight: '600', color: '#111827' },
});
