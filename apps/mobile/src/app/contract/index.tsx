import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Card, CardLabel, CardTitle, CardValue } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface TenantContract {
  id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  payment_frequency?: string;
  frequency?: string;
  grace_period?: number;
  grace_period_days?: number;
  status: string;
  document_url?: string;
  unit_number?: string;
  property_name?: string;
  currency?: string;
  notes?: string;
  unit?: {
    unit_number: string;
    property?: { name: string };
  };
}

const formatCurrency = (amount: number, currency = 'AED') =>
  `${currency} ${Number(amount).toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateLong = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  bi_annual: 'Bi-Annual',
  annual: 'Annual',
  weekly: 'Weekly',
};

function DaysCountdown({ endDate }: { endDate: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <View style={[styles.countdownBox, { backgroundColor: '#fee2e2' }]}>
        <Text style={[styles.countdownNumber, { color: '#dc2626' }]}>
          {Math.abs(diffDays)}
        </Text>
        <Text style={[styles.countdownLabel, { color: '#dc2626' }]}>days overdue</Text>
      </View>
    );
  }
  if (diffDays === 0) {
    return (
      <View style={[styles.countdownBox, { backgroundColor: '#fef9c3' }]}>
        <Text style={[styles.countdownNumber, { color: '#ca8a04' }]}>Today</Text>
        <Text style={[styles.countdownLabel, { color: '#ca8a04' }]}>contract ends</Text>
      </View>
    );
  }

  const bgColor = diffDays <= 30 ? '#fff7ed' : diffDays <= 90 ? '#fef9c3' : '#f0fdf4';
  const textColor = diffDays <= 30 ? '#ea580c' : diffDays <= 90 ? '#ca8a04' : '#16a34a';

  return (
    <View style={[styles.countdownBox, { backgroundColor: bgColor }]}>
      <Text style={[styles.countdownNumber, { color: textColor }]}>{diffDays}</Text>
      <Text style={[styles.countdownLabel, { color: textColor }]}>days remaining</Text>
    </View>
  );
}

export default function ContractScreen() {
  const { user } = useAuthStore();

  const { data: contract, isLoading } = useQuery<TenantContract>({
    queryKey: ['tenant-contract', user?.tenant_id],
    queryFn: async () => {
      const endpoint = user?.tenant_id
        ? `/tenants/${user.tenant_id}/contracts`
        : '/tenants/me/contract';
      const res = await apiClient.get(endpoint);
      if (Array.isArray(res.data)) {
        return res.data.find((c: TenantContract) => c.status === 'active') ?? res.data[0];
      }
      return res.data;
    },
  });

  const handleDownload = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open document URL.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!contract) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No Active Contract</Text>
        <Text style={styles.emptySubtext}>
          Your contract information is not available yet. Please contact your property manager.
        </Text>
      </View>
    );
  }

  const frequency = contract.payment_frequency ?? contract.frequency ?? 'monthly';
  const graceDays = contract.grace_period ?? contract.grace_period_days ?? 0;
  const unitNumber = contract.unit_number ?? contract.unit?.unit_number;
  const propertyName = contract.property_name ?? contract.unit?.property?.name;

  const startMs = new Date(contract.start_date).getTime();
  const endMs = new Date(contract.end_date).getTime();
  const nowMs = Date.now();
  const progressPct = Math.min(100, Math.max(0, ((nowMs - startMs) / (endMs - startMs)) * 100));

  const durationMonths = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24 * 30.44));

  const monthlyEquivalent =
    frequency === 'annual'
      ? contract.rent_amount / 12
      : frequency === 'bi_annual'
      ? contract.rent_amount / 6
      : frequency === 'quarterly'
      ? contract.rent_amount / 3
      : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.heading}>My Contract</Text>
          {propertyName ? <Text style={styles.propertyName}>{propertyName}</Text> : null}
          {unitNumber ? <Text style={styles.unitNumber}>Unit {unitNumber}</Text> : null}
        </View>
        <View style={styles.headerRight}>
          <StatusBadge status={contract.status} />
          <DaysCountdown endDate={contract.end_date} />
        </View>
      </View>

      {/* Rent */}
      <Card style={styles.rentCard}>
        <CardTitle>{FREQUENCY_LABELS[frequency] ?? frequency} Rent</CardTitle>
        <CardValue color="#1d4ed8">
          {formatCurrency(contract.rent_amount, contract.currency)}
        </CardValue>
        {monthlyEquivalent != null ? (
          <CardLabel>
            ≈ {formatCurrency(monthlyEquivalent, contract.currency)} / month
          </CardLabel>
        ) : null}
      </Card>

      {/* Contract Period */}
      <Text style={styles.sectionTitle}>Contract Period</Text>
      <View style={styles.datesRow}>
        <Card style={[styles.dateCard]}>
          <CardTitle>Start Date</CardTitle>
          <Text style={styles.dateText}>{formatDate(contract.start_date)}</Text>
        </Card>
        <Card style={[styles.dateCard]}>
          <CardTitle>End Date</CardTitle>
          <Text style={styles.dateText}>{formatDate(contract.end_date)}</Text>
        </Card>
        <Card style={[styles.dateCard]}>
          <CardTitle>Duration</CardTitle>
          <Text style={styles.dateText}>{durationMonths}mo</Text>
        </Card>
      </View>

      {/* Progress bar */}
      <Card style={styles.progressCard}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressStart}>{formatDateLong(contract.start_date)}</Text>
          <Text style={styles.progressPct}>{Math.round(progressPct)}% elapsed</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
        <Text style={styles.progressEnd}>{formatDateLong(contract.end_date)}</Text>
      </Card>

      {/* Grace Period */}
      {graceDays > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Grace Period</Text>
          <Card style={styles.graceCard}>
            <View style={styles.graceRow}>
              <View style={styles.graceIconBox}>
                <Text style={styles.graceIcon}>⏰</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.graceValue}>{graceDays} days</Text>
                <Text style={styles.graceNote}>
                  Payments received within this period will not incur late fees.
                </Text>
              </View>
            </View>
          </Card>
        </>
      ) : null}

      {/* Notes */}
      {contract.notes ? (
        <>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Card>
            <Text style={styles.notesText}>{contract.notes}</Text>
          </Card>
        </>
      ) : null}

      {/* Document */}
      {contract.document_url ? (
        <Button
          title="Download Contract Document"
          variant="outline"
          onPress={() => handleDownload(contract.document_url!)}
          style={styles.docButton}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827' },
  propertyName: { fontSize: 14, color: '#374151', marginTop: 3, fontWeight: '500' },
  unitNumber: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  headerRight: { alignItems: 'flex-end', gap: 8 },

  countdownBox: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', marginTop: 6 },
  countdownNumber: { fontSize: 22, fontWeight: '800' },
  countdownLabel: { fontSize: 11, fontWeight: '600', marginTop: 1 },

  rentCard: { marginBottom: 16, backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },

  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 10, marginTop: 4 },

  datesRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  dateCard: { flex: 1 },
  dateText: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 4 },

  progressCard: { marginBottom: 16 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressStart: { fontSize: 11, color: '#6b7280' },
  progressPct: { fontSize: 11, color: '#2563EB', fontWeight: '600' },
  progressTrack: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 4 },
  progressEnd: { fontSize: 11, color: '#6b7280', textAlign: 'right' },

  graceCard: { marginBottom: 16 },
  graceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  graceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fef9c3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  graceIcon: { fontSize: 22 },
  graceValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  graceNote: { fontSize: 12, color: '#6b7280', marginTop: 3, lineHeight: 17 },

  notesText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  docButton: { marginTop: 8 },
});
