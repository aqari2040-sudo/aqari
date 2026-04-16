import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../lib/api-client';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Button } from '../../../components/ui/Button';

interface MaintenanceRequest {
  id: string;
  unit_number: string;
  property_name?: string;
  category: string;
  description: string;
  status: string;
  budget?: number | null;
  total_cost?: number | null;
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

export default function AddCostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null);

  const { data: request, isLoading, isError } = useQuery({
    queryKey: ['maintenance-request', id],
    queryFn: async () => {
      const res = await apiClient.get(`/maintenance/${id}`);
      return (res.data?.data ?? res.data) as MaintenanceRequest;
    },
    enabled: !!id,
  });

  const addCostMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/maintenance/${id}/costs`, {
        amount: parseFloat(amount),
        description: description.trim(),
      });
      return res.data?.data ?? res.data;
    },
    onSuccess: (responseData) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-request', id] });
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });

      const warning = responseData?.budget_warning ?? responseData?.warning;
      if (warning) {
        setBudgetWarning(warning);
        Alert.alert(
          'Cost Added — Budget Warning',
          warning,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Success', 'Cost has been added successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? 'Failed to add cost. Please try again.';
      Alert.alert('Error', msg);
    },
  });

  const handleSubmit = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount greater than 0.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Validation', 'Please enter a description for the cost.');
      return;
    }
    addCostMutation.mutate();
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading request details...</Text>
      </View>
    );
  }

  if (isError || !request) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load maintenance request.</Text>
        <Button title="Go Back" onPress={() => router.back()} variant="outline" style={{ marginTop: 16 }} />
      </View>
    );
  }

  const budget = request.budget;
  const totalCost = request.total_cost ?? 0;
  const budgetUsedPct = budget ? Math.min((totalCost / budget) * 100, 100) : null;
  const remaining = budget ? budget - totalCost : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Request Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Maintenance Request</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View>
              <Text style={styles.unitText}>Unit {request.unit_number}</Text>
              {request.property_name ? (
                <Text style={styles.propertyText}>{request.property_name}</Text>
              ) : null}
            </View>
            <StatusBadge status={request.status} />
          </View>

          <View style={styles.divider} />

          <View style={styles.categoryRow}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{categoryLabel(request.category)}</Text>
            </View>
          </View>

          <Text style={styles.requestDescription}>{request.description}</Text>
        </View>
      </View>

      {/* Budget Info */}
      {budget != null && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget</Text>
          <View style={styles.budgetCard}>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>Total Budget</Text>
              <Text style={styles.budgetValue}>AED {Number(budget).toLocaleString()}</Text>
            </View>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>Spent</Text>
              <Text style={[styles.budgetValue, { color: '#dc2626' }]}>
                AED {Number(totalCost).toLocaleString()}
              </Text>
            </View>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>Remaining</Text>
              <Text style={[styles.budgetValue, { color: remaining! < 0 ? '#dc2626' : '#16a34a' }]}>
                AED {Number(remaining).toLocaleString()}
              </Text>
            </View>

            {/* Budget Progress Bar */}
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${budgetUsedPct ?? 0}%` as any,
                    backgroundColor: (budgetUsedPct ?? 0) >= 90 ? '#dc2626' : (budgetUsedPct ?? 0) >= 70 ? '#f59e0b' : '#16a34a',
                  },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>{Math.round(budgetUsedPct ?? 0)}% used</Text>

            {(budgetUsedPct ?? 0) >= 80 && (
              <View style={styles.budgetWarning}>
                <Text style={styles.budgetWarningText}>
                  ⚠️ Budget is {Math.round(budgetUsedPct ?? 0)}% used. Adding this cost may exceed the budget.
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Cost Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Cost</Text>
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>Amount (AED) *</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#9ca3af"
          />

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the cost (e.g. parts, labour...)"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Budget Warning from Server */}
      {budgetWarning && (
        <View style={styles.serverWarning}>
          <Text style={styles.serverWarningText}>⚠️ {budgetWarning}</Text>
        </View>
      )}

      <Button
        title="Add Cost"
        onPress={handleSubmit}
        loading={addCostMutation.isPending}
        style={styles.submitBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6b7280' },
  errorText: { fontSize: 14, color: '#991b1b', textAlign: 'center' },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  unitText: { fontSize: 18, fontWeight: '700', color: '#111827' },
  propertyText: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },
  categoryRow: { flexDirection: 'row', marginBottom: 8 },
  categoryChip: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryText: { fontSize: 12, fontWeight: '600', color: '#1e40af' },
  requestDescription: { fontSize: 14, color: '#374151', lineHeight: 20 },

  budgetCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetLabel: { fontSize: 14, color: '#6b7280' },
  budgetValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  budgetWarning: {
    backgroundColor: '#fef9c3',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  budgetWarningText: { fontSize: 13, color: '#854d0e' },

  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textArea: { minHeight: 80 },

  serverWarning: {
    backgroundColor: '#fef9c3',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  serverWarningText: { fontSize: 14, color: '#854d0e' },

  submitBtn: { marginTop: 4 },
});
