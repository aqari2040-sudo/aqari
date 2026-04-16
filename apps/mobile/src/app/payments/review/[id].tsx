import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../lib/api-client';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Button } from '../../../components/ui/Button';

interface PaymentDetail {
  id: string;
  tenant_name: string;
  unit_number: string;
  amount: number;
  payment_date: string;
  status: string;
  receipt_url: string | null;
  ocr_confidence: number | null;
  ocr_extracted_amount: number | null;
  ocr_extracted_date: string | null;
  ocr_low_confidence_flag: boolean;
  notes?: string;
}

function ConfidenceBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const pct = Math.round(value * 100);
  const color = pct >= 85 ? '#166534' : pct >= 60 ? '#854d0e' : '#991b1b';
  const bg = pct >= 85 ? '#dcfce7' : pct >= 60 ? '#fef9c3' : '#fee2e2';
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>Confidence: {pct}%</Text>
    </View>
  );
}

export default function ReviewReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [confirmAmount, setConfirmAmount] = useState('');
  const [confirmDate, setConfirmDate] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [imageZoomed, setImageZoomed] = useState(false);

  const { data: payment, isLoading, isError } = useQuery({
    queryKey: ['payment', id],
    queryFn: async () => {
      const res = await apiClient.get(`/payments/${id}`);
      const p = (res.data?.data ?? res.data) as PaymentDetail;
      setConfirmAmount(String(p.ocr_extracted_amount ?? p.amount ?? ''));
      setConfirmDate(p.ocr_extracted_date ?? p.payment_date ?? '');
      return p;
    },
    enabled: !!id,
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch(`/payments/${id}/confirm`, {
        amount: parseFloat(confirmAmount),
        payment_date: confirmDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'pending_review'] });
      queryClient.invalidateQueries({ queryKey: ['payment', id] });
      Alert.alert('Confirmed', 'Payment has been confirmed.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to confirm payment. Please try again.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      await apiClient.patch(`/payments/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'pending_review'] });
      queryClient.invalidateQueries({ queryKey: ['payment', id] });
      setShowRejectModal(false);
      Alert.alert('Rejected', 'Payment has been rejected.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to reject payment. Please try again.');
    },
  });

  const handleConfirm = () => {
    if (!confirmAmount || isNaN(parseFloat(confirmAmount))) {
      Alert.alert('Validation', 'Please enter a valid amount.');
      return;
    }
    if (!confirmDate) {
      Alert.alert('Validation', 'Please enter a payment date.');
      return;
    }
    Alert.alert('Confirm Payment', `Confirm AED ${confirmAmount} on ${confirmDate}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => confirmMutation.mutate() },
    ]);
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      Alert.alert('Validation', 'Please provide a reason for rejection.');
      return;
    }
    rejectMutation.mutate(rejectReason.trim());
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading receipt...</Text>
      </View>
    );
  }

  if (isError || !payment) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load payment details.</Text>
        <Button title="Go Back" onPress={() => router.back()} variant="outline" style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Receipt Image */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receipt Image</Text>
          {payment.receipt_url ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setImageZoomed(true)}
            >
              <Image
                source={{ uri: payment.receipt_url }}
                style={styles.receiptImage}
                resizeMode="contain"
              />
              <Text style={styles.tapHint}>Tap to zoom</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.noImage}>
              <Text style={styles.noImageText}>No receipt image available</Text>
            </View>
          )}
        </View>

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Info</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tenant</Text>
              <Text style={styles.infoValue}>{payment.tenant_name}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Unit</Text>
              <Text style={styles.infoValue}>{payment.unit_number}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <StatusBadge status={payment.status} />
            </View>
          </View>
        </View>

        {/* OCR Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OCR Extraction Results</Text>
          <View style={styles.infoCard}>
            <View style={styles.ocrHeader}>
              <ConfidenceBadge value={payment.ocr_confidence} />
            </View>

            {payment.ocr_low_confidence_flag && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <Text style={styles.warningText}>
                  Low confidence extraction — please verify the details carefully before confirming.
                </Text>
              </View>
            )}

            <View style={[styles.infoRow, { marginTop: 8 }]}>
              <Text style={styles.infoLabel}>Extracted Amount</Text>
              <Text style={styles.infoValue}>
                {payment.ocr_extracted_amount != null
                  ? `AED ${Number(payment.ocr_extracted_amount).toLocaleString()}`
                  : '—'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Extracted Date</Text>
              <Text style={styles.infoValue}>
                {payment.ocr_extracted_date ?? '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Editable Confirmation Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confirm Details</Text>
          <View style={styles.infoCard}>
            <Text style={styles.fieldLabel}>Amount (AED)</Text>
            <TextInput
              style={styles.input}
              value={confirmAmount}
              onChangeText={setConfirmAmount}
              keyboardType="decimal-pad"
              placeholder="Enter amount"
              placeholderTextColor="#9ca3af"
            />
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Payment Date</Text>
            <TextInput
              style={styles.input}
              value={confirmDate}
              onChangeText={setConfirmDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="Confirm Payment"
            onPress={handleConfirm}
            variant="primary"
            loading={confirmMutation.isPending}
            style={styles.confirmBtn}
          />
          <Button
            title="Reject"
            onPress={() => setShowRejectModal(true)}
            variant="destructive"
            disabled={confirmMutation.isPending}
            style={styles.rejectBtn}
          />
        </View>
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Payment</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for rejecting this receipt.
            </Text>
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
                onPress={() => { setShowRejectModal(false); setRejectReason(''); }}
                variant="outline"
                style={styles.modalBtn}
              />
              <Button
                title="Reject"
                onPress={handleReject}
                variant="destructive"
                loading={rejectMutation.isPending}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Zoom Modal */}
      <Modal
        visible={imageZoomed}
        transparent
        animationType="fade"
        onRequestClose={() => setImageZoomed(false)}
      >
        <TouchableOpacity
          style={styles.zoomOverlay}
          activeOpacity={1}
          onPress={() => setImageZoomed(false)}
        >
          {payment.receipt_url && (
            <Image
              source={{ uri: payment.receipt_url }}
              style={styles.zoomedImage}
              resizeMode="contain"
            />
          )}
          <Text style={styles.zoomDismiss}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>
    </>
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

  receiptImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  tapHint: { textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 4 },
  noImage: {
    height: 120,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: { fontSize: 14, color: '#9ca3af' },

  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: { fontSize: 14, color: '#6b7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 8 },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  ocrHeader: { alignItems: 'flex-start', marginBottom: 8 },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef9c3',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  warningIcon: { fontSize: 16 },
  warningText: { fontSize: 13, color: '#854d0e', flex: 1 },

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

  actions: { gap: 12, marginTop: 4 },
  confirmBtn: { backgroundColor: '#16a34a' },
  rejectBtn: {},

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

  zoomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomedImage: { width: '100%', height: '85%' },
  zoomDismiss: { color: '#fff', fontSize: 13, marginTop: 12, opacity: 0.7 },
});
