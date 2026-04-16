import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

interface MaintenanceCost {
  id: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

interface MaintenanceRequest {
  id: string;
  unit_number: string;
  property_name: string;
  category: string;
  description: string;
  status: string;
  costs: MaintenanceCost[];
}

function categoryLabel(cat: string) {
  const map: Record<string, string> = {
    plumbing: 'Plumbing',
    electrical: 'Electrical',
    hvac: 'HVAC',
    appliance: 'Appliance',
    structural: 'Structural',
    other: 'Other',
  };
  return map[cat] ?? cat;
}

function CostApprovalItem({
  request,
  cost,
  onApprove,
  onReject,
  approvingId,
}: {
  request: MaintenanceRequest;
  cost: MaintenanceCost;
  onApprove: (costId: string) => void;
  onReject: (costId: string) => void;
  approvingId: string | null;
}) {
  const date = new Date(cost.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.unitText}>Unit {request.unit_number}</Text>
          {request.property_name ? (
            <Text style={styles.propertyText}>{request.property_name}</Text>
          ) : null}
        </View>
        <StatusBadge status={cost.status} />
      </View>

      <View style={styles.divider} />

      <View style={styles.metaRow}>
        <View style={styles.categoryChip}>
          <Text style={styles.categoryText}>{categoryLabel(request.category)}</Text>
        </View>
        <Text style={styles.dateText}>{date}</Text>
      </View>

      <Text style={styles.costDescription}>{cost.description}</Text>
      <Text style={styles.costAmount}>AED {Number(cost.amount).toLocaleString()}</Text>

      {cost.status === 'pending' && (
        <View style={styles.actions}>
          <Button
            title="Approve"
            onPress={() => onApprove(cost.id)}
            variant="primary"
            loading={approvingId === cost.id}
            style={styles.approveBtn}
          />
          <Button
            title="Reject"
            onPress={() => onReject(cost.id)}
            variant="destructive"
            disabled={approvingId === cost.id}
            style={styles.rejectBtn}
          />
        </View>
      )}
    </View>
  );
}

export default function CostApprovalsScreen() {
  const queryClient = useQueryClient();
  const [rejectingCostId, setRejectingCostId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['maintenance', 'pending_costs'],
    queryFn: async () => {
      const res = await apiClient.get('/maintenance', {
        params: { has_pending_costs: true },
      });
      return (res.data?.data ?? res.data) as MaintenanceRequest[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (costId: string) => {
      await apiClient.patch(`/maintenance/costs/${costId}/approve`);
    },
    onMutate: (costId) => setApprovingId(costId),
    onSettled: () => setApprovingId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'pending_costs'] });
      Alert.alert('Approved', 'Cost has been approved.');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to approve cost. Please try again.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ costId, reason }: { costId: string; reason: string }) => {
      await apiClient.patch(`/maintenance/costs/${costId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'pending_costs'] });
      setRejectingCostId(null);
      setRejectReason('');
      Alert.alert('Rejected', 'Cost has been rejected.');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to reject cost. Please try again.');
    },
  });

  const handleApprove = (costId: string) => {
    Alert.alert('Approve Cost', 'Are you sure you want to approve this cost?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => approveMutation.mutate(costId) },
    ]);
  };

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) {
      Alert.alert('Validation', 'Please provide a rejection reason.');
      return;
    }
    if (!rejectingCostId) return;
    rejectMutation.mutate({ costId: rejectingCostId, reason: rejectReason.trim() });
  };

  // Flatten all pending costs across requests into a single list
  const flatItems: { request: MaintenanceRequest; cost: MaintenanceCost }[] = [];
  (data ?? []).forEach((req) => {
    (req.costs ?? []).forEach((cost) => {
      if (cost.status === 'pending') {
        flatItems.push({ request: req, cost });
      }
    });
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.screenTitle}>Cost Approvals</Text>
        <Text style={styles.screenSubtitle}>
          {flatItems.length} pending approval{flatItems.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Failed to load approvals. Pull to retry.</Text>
        </View>
      )}

      <FlatList
        data={flatItems}
        keyExtractor={(item) => item.cost.id}
        renderItem={({ item }) => (
          <CostApprovalItem
            request={item.request}
            cost={item.cost}
            onApprove={handleApprove}
            onReject={(costId) => { setRejectingCostId(costId); setRejectReason(''); }}
            approvingId={approvingId}
          />
        )}
        contentContainerStyle={[
          styles.list,
          flatItems.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#2563EB"
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <EmptyState message="Loading cost approvals..." />
          ) : (
            <EmptyState message="No pending costs to approve." />
          )
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Reject Modal */}
      <Modal
        visible={!!rejectingCostId}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectingCostId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Cost</Text>
            <Text style={styles.modalSubtitle}>Provide a reason for rejection.</Text>
            <TextInput
              style={styles.rejectInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Enter rejection reason..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => { setRejectingCostId(null); setRejectReason(''); }}
                variant="outline"
                style={styles.modalBtn}
              />
              <Button
                title="Reject"
                onPress={handleRejectConfirm}
                variant="destructive"
                loading={rejectMutation.isPending}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  screenTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  screenSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  errorBanner: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: { fontSize: 13, color: '#991b1b', textAlign: 'center' },

  list: { padding: 16, gap: 12 },
  listEmpty: { flex: 1 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: { flex: 1, marginRight: 8 },
  unitText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  propertyText: { fontSize: 13, color: '#6b7280', marginTop: 1 },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },

  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  categoryChip: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryText: { fontSize: 12, fontWeight: '600', color: '#1e40af' },
  dateText: { fontSize: 12, color: '#9ca3af' },

  costDescription: { fontSize: 14, color: '#374151', marginBottom: 6, lineHeight: 20 },
  costAmount: { fontSize: 20, fontWeight: '700', color: '#2563EB', marginBottom: 12 },

  actions: { flexDirection: 'row', gap: 10 },
  approveBtn: { flex: 1, backgroundColor: '#16a34a' },
  rejectBtn: { flex: 1 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  modalSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  rejectInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 80,
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1 },
});
