import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';

interface PaymentSchedule {
  id: string;
  due_date: string;
  amount_due: number;
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

const uploadFile = async (uri: string): Promise<string> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const fileName = `receipts/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('receipts').upload(fileName, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('receipts').getPublicUrl(fileName);
  return data.publicUrl;
};

export default function UploadReceiptScreen() {
  const queryClient = useQueryClient();
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [uploading, setUploading] = useState(false);

  const { data: schedules, isLoading: schedulesLoading } = useQuery<PaymentSchedule[]>({
    queryKey: ['payment-schedules-pending'],
    queryFn: async () => {
      const res = await apiClient.get('/payments/schedules');
      return (res.data as PaymentSchedule[]).filter(
        (s) => s.status === 'pending' || s.status === 'partial' || s.status === 'overdue'
      );
    },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Camera access is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!image) throw new Error('Please select a receipt image.');
      if (!selectedScheduleId) throw new Error('Please select a billing period.');

      setUploading(true);
      let receiptUrl: string;
      try {
        receiptUrl = await uploadFile(image.uri);
      } finally {
        setUploading(false);
      }

      const payload: Record<string, unknown> = {
        schedule_id: selectedScheduleId,
        receipt_url: receiptUrl,
        payment_date: paymentDate,
      };
      if (amount.trim()) {
        payload.amount = parseFloat(amount);
      }

      const res = await apiClient.post('/payments/upload-receipt', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['payment-schedules-pending'] });
      const id = data?.payment_id ?? data?.id ?? selectedScheduleId;
      router.replace(`/payments/${id}`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to upload receipt.';
      Alert.alert('Upload Failed', msg);
    },
  });

  const isSubmitting = mutation.isPending || uploading;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Upload Payment Receipt</Text>

      {/* Image Picker */}
      <Text style={styles.label}>Receipt Photo *</Text>
      {image ? (
        <View style={styles.imagePreviewWrapper}>
          <Image source={{ uri: image.uri }} style={styles.imagePreview} resizeMode="cover" />
          <TouchableOpacity style={styles.changeImageBtn} onPress={pickImage}>
            <Text style={styles.changeImageText}>Change Image</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.imagePickerRow}>
          <TouchableOpacity style={styles.imagePickerBtn} onPress={takePhoto} activeOpacity={0.7}>
            <Text style={styles.imagePickerIcon}>📷</Text>
            <Text style={styles.imagePickerLabel}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage} activeOpacity={0.7}>
            <Text style={styles.imagePickerIcon}>🖼️</Text>
            <Text style={styles.imagePickerLabel}>From Library</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Billing Period */}
      <Text style={styles.label}>Billing Period *</Text>
      {schedulesLoading ? (
        <ActivityIndicator color="#2563EB" style={{ marginBottom: 16 }} />
      ) : schedules && schedules.length > 0 ? (
        <View style={styles.schedulePicker}>
          {schedules.map((s) => {
            const isSelected = selectedScheduleId === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.scheduleOption, isSelected && styles.scheduleOptionSelected]}
                onPress={() => setSelectedScheduleId(s.id)}
                activeOpacity={0.7}
              >
                <View style={styles.scheduleOptionInner}>
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.scheduleDate, isSelected && { color: '#2563EB' }]}>
                      Due {formatDate(s.due_date)}
                    </Text>
                    <Text style={styles.scheduleAmount}>
                      {formatCurrency(s.remaining)} remaining
                    </Text>
                    {s.billing_period ? (
                      <Text style={styles.schedulePeriod}>{s.billing_period}</Text>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.noPendingBox}>
          <Text style={styles.noPendingText}>No pending payments found.</Text>
        </View>
      )}

      {/* Amount (optional) */}
      <Text style={styles.label}>Amount Paid (optional)</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        placeholder="e.g. 5000"
        keyboardType="decimal-pad"
        placeholderTextColor="#9ca3af"
      />

      {/* Date */}
      <Text style={styles.label}>Payment Date *</Text>
      <TextInput
        style={styles.input}
        value={paymentDate}
        onChangeText={setPaymentDate}
        placeholder="YYYY-MM-DD"
        keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
        placeholderTextColor="#9ca3af"
      />

      <Button
        title={isSubmitting ? 'Uploading...' : 'Submit Receipt'}
        onPress={() => mutation.mutate()}
        loading={isSubmitting}
        disabled={isSubmitting || !image || !selectedScheduleId}
        style={{ marginTop: 8 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 20 },

  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },

  imagePickerRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  imagePickerBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    borderStyle: 'dashed',
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerIcon: { fontSize: 32, marginBottom: 6 },
  imagePickerLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },

  imagePreviewWrapper: { borderRadius: 12, overflow: 'hidden', marginBottom: 4 },
  imagePreview: { width: '100%', height: 220, backgroundColor: '#e5e7eb' },
  changeImageBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  changeImageText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  schedulePicker: { gap: 8, marginBottom: 4 },
  scheduleOption: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    padding: 12,
  },
  scheduleOptionSelected: { borderColor: '#2563EB', backgroundColor: '#eff6ff' },
  scheduleOptionInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: { borderColor: '#2563EB' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' },
  scheduleDate: { fontSize: 14, fontWeight: '600', color: '#111827' },
  scheduleAmount: { fontSize: 12, color: '#dc2626', marginTop: 2 },
  schedulePeriod: { fontSize: 11, color: '#6b7280', marginTop: 1 },

  noPendingBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 4,
  },
  noPendingText: { color: '#6b7280', fontSize: 14 },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
});
