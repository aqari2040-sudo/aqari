import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Card, CardTitle, CardValue, CardLabel } from '../../components/ui/Card';

interface OcrResult {
  extracted_amount?: number;
  extracted_date?: string;
  confidence?: number;
}

interface PaymentDetail {
  id: string;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  remaining: number;
  status: string;
  billing_period?: string;
  receipt_url?: string;
  ocr_result?: OcrResult;
  confirmed_amount?: number;
  confirmed_date?: string;
  rejection_reason?: string;
  payment_date?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatCurrency = (amount?: number) => {
  if (amount == null) return '—';
  return `AED ${Number(amount).toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const pct = (val?: number) =>
  val != null ? `${Math.round(val * 100)}%` : '—';

export default function PaymentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [imageError, setImageError] = useState(false);

  const { data: payment, isLoading } = useQuery<PaymentDetail>({
    queryKey: ['payment-detail', id],
    queryFn: async () => {
      const res = await apiClient.get(`/payments/schedules/${id}`);
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

  if (!payment) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Payment not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status & Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heading}>Payment Details</Text>
          <Text style={styles.subheading}>Due {formatDate(payment.due_date)}</Text>
        </View>
        <StatusBadge status={payment.status} />
      </View>

      {/* Amounts Card */}
      <Card style={styles.card}>
        <CardTitle>Amount Due</CardTitle>
        <CardValue>{formatCurrency(payment.amount_due)}</CardValue>
        <View style={styles.amountsRow}>
          <View style={styles.amountBlock}>
            <CardLabel>Paid</CardLabel>
            <Text style={[styles.amountVal, { color: '#16a34a' }]}>
              {formatCurrency(payment.amount_paid)}
            </Text>
          </View>
          <View style={styles.amountBlock}>
            <CardLabel>Remaining</CardLabel>
            <Text style={[styles.amountVal, { color: payment.remaining > 0 ? '#dc2626' : '#16a34a' }]}>
              {formatCurrency(payment.remaining)}
            </Text>
          </View>
          {payment.billing_period ? (
            <View style={styles.amountBlock}>
              <CardLabel>Period</CardLabel>
              <Text style={styles.amountVal}>{payment.billing_period}</Text>
            </View>
          ) : null}
        </View>
      </Card>

      {/* Receipt Image */}
      {payment.receipt_url ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receipt</Text>
          {imageError ? (
            <View style={styles.imageFallback}>
              <Text style={styles.imageFallbackText}>Unable to load receipt image.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              style={{ borderRadius: 12 }}
              contentContainerStyle={{ flexGrow: 1 }}
              maximumZoomScale={3}
              minimumZoomScale={1}
            >
              <Image
                source={{ uri: payment.receipt_url }}
                style={[styles.receiptImage, { width: SCREEN_WIDTH - 32 }]}
                resizeMode="contain"
                onError={() => setImageError(true)}
              />
            </ScrollView>
          )}
        </View>
      ) : null}

      {/* OCR Results */}
      {payment.ocr_result ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OCR Extraction</Text>
          <Card>
            <View style={styles.ocrRow}>
              <View style={styles.ocrItem}>
                <CardLabel>Extracted Amount</CardLabel>
                <Text style={styles.ocrValue}>
                  {formatCurrency(payment.ocr_result.extracted_amount)}
                </Text>
              </View>
              <View style={styles.ocrItem}>
                <CardLabel>Extracted Date</CardLabel>
                <Text style={styles.ocrValue}>
                  {formatDate(payment.ocr_result.extracted_date)}
                </Text>
              </View>
              <View style={styles.ocrItem}>
                <CardLabel>Confidence</CardLabel>
                <Text
                  style={[
                    styles.ocrValue,
                    {
                      color:
                        (payment.ocr_result.confidence ?? 0) >= 0.8
                          ? '#16a34a'
                          : (payment.ocr_result.confidence ?? 0) >= 0.5
                          ? '#ca8a04'
                          : '#dc2626',
                    },
                  ]}
                >
                  {pct(payment.ocr_result.confidence)}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      ) : null}

      {/* Confirmed Details */}
      {payment.status === 'confirmed' || payment.status === 'paid' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confirmation</Text>
          <Card style={styles.confirmedCard}>
            <View style={styles.confirmedRow}>
              <Text style={styles.confirmedIcon}>✅</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.confirmedLabel}>Confirmed Amount</Text>
                <Text style={styles.confirmedValue}>
                  {formatCurrency(payment.confirmed_amount ?? payment.amount_paid)}
                </Text>
                {payment.confirmed_date ? (
                  <Text style={styles.confirmedDate}>
                    Confirmed on {formatDate(payment.confirmed_date)}
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>
        </View>
      ) : null}

      {/* Rejection Reason */}
      {payment.status === 'rejected' && payment.rejection_reason ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rejection Reason</Text>
          <Card style={styles.rejectedCard}>
            <View style={styles.rejectedRow}>
              <Text style={styles.rejectedIcon}>❌</Text>
              <Text style={styles.rejectedText}>{payment.rejection_reason}</Text>
            </View>
          </Card>
        </View>
      ) : null}

      {/* Upload Receipt CTA if still pending */}
      {(payment.status === 'pending' || payment.status === 'partial' || payment.status === 'overdue') &&
      !payment.receipt_url ? (
        <TouchableOpacity
          style={styles.uploadCta}
          onPress={() => router.push('/payments/upload-receipt')}
          activeOpacity={0.8}
        >
          <Text style={styles.uploadCtaText}>Upload Receipt →</Text>
        </TouchableOpacity>
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
  subheading: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  card: { marginBottom: 16 },
  amountsRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  amountBlock: { flex: 1 },
  amountVal: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 2 },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },

  receiptImage: { height: 320, borderRadius: 12, backgroundColor: '#f3f4f6' },
  imageFallback: {
    height: 120,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackText: { color: '#9ca3af', fontSize: 13 },

  ocrRow: { flexDirection: 'row', gap: 8 },
  ocrItem: { flex: 1 },
  ocrValue: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 2 },

  confirmedCard: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  confirmedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confirmedIcon: { fontSize: 24 },
  confirmedLabel: { fontSize: 12, color: '#16a34a' },
  confirmedValue: { fontSize: 18, fontWeight: '700', color: '#15803d', marginTop: 2 },
  confirmedDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  rejectedCard: { borderColor: '#fecaca', backgroundColor: '#fff5f5' },
  rejectedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rejectedIcon: { fontSize: 20, marginTop: 2 },
  rejectedText: { flex: 1, fontSize: 14, color: '#dc2626', lineHeight: 20 },

  uploadCta: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  uploadCtaText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
