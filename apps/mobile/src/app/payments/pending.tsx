import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';

interface PendingPayment {
  id: string;
  tenant_name: string;
  unit_number: string;
  amount: number;
  payment_date: string;
  ocr_confidence: number | null;
  receipt_url: string | null;
  status: string;
}

function ConfidenceBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const pct = Math.round(value * 100);
  const color =
    pct >= 85 ? '#166534' : pct >= 60 ? '#854d0e' : '#991b1b';
  const bg =
    pct >= 85 ? '#dcfce7' : pct >= 60 ? '#fef9c3' : '#fee2e2';
  return (
    <View style={[styles.confidenceBadge, { backgroundColor: bg }]}>
      <Text style={[styles.confidenceText, { color }]}>OCR {pct}%</Text>
    </View>
  );
}

function PaymentCard({ item }: { item: PendingPayment }) {
  const date = new Date(item.payment_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/payments/review/${item.id}`)}
    >
      <View style={styles.cardRow}>
        {item.receipt_url ? (
          <Image source={{ uri: item.receipt_url }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Text style={styles.thumbnailIcon}>🧾</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.tenantName}>{item.tenant_name}</Text>
            <StatusBadge status={item.status} />
          </View>
          <Text style={styles.unitNumber}>Unit {item.unit_number}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.amount}>
              AED {Number(item.amount).toLocaleString()}
            </Text>
            <Text style={styles.date}>{date}</Text>
          </View>
          <ConfidenceBadge value={item.ocr_confidence} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function PendingReceiptsScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['payments', 'pending_review'],
    queryFn: async () => {
      const res = await apiClient.get('/payments', {
        params: { status: 'pending_review' },
      });
      return (res.data?.data ?? res.data) as PendingPayment[];
    },
  });

  const payments = data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.screenTitle}>Pending Receipts</Text>
        <Text style={styles.screenSubtitle}>
          {payments.length} awaiting review
        </Text>
      </View>

      {isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Failed to load receipts. Pull to retry.</Text>
        </View>
      )}

      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PaymentCard item={item} />}
        contentContainerStyle={[
          styles.list,
          payments.length === 0 && styles.listEmpty,
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
            <EmptyState message="Loading receipts..." />
          ) : (
            <EmptyState message="No pending receipts to review." />
          )
        }
        showsVerticalScrollIndicator={false}
      />
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
    padding: 12,
  },
  cardRow: { flexDirection: 'row', gap: 12 },

  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailIcon: { fontSize: 24 },

  cardBody: { flex: 1 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  tenantName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  unitNumber: { fontSize: 13, color: '#6b7280', marginBottom: 6 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: { fontSize: 16, fontWeight: '700', color: '#2563EB' },
  date: { fontSize: 12, color: '#9ca3af' },

  confidenceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
  },
  confidenceText: { fontSize: 11, fontWeight: '600' },
});
