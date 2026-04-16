import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { Card, CardTitle, CardValue, CardLabel } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/auth-store';

interface OccupancyData {
  total: number;
  occupied: number;
  vacant: number;
  occupancy_rate: number;
}

interface PaymentsSummary {
  collected: number;
  due: number;
  collection_rate: number;
  overdue_count: number;
}

interface MaintenanceSummary {
  pending_approvals: number;
  total_cost_this_month: number;
  open_requests: number;
}

interface AlertsData {
  count: number;
  items?: { id: string; message: string; severity: string }[];
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function QuickActionButton({
  label,
  subtitle,
  onPress,
  color = '#2563EB',
}: {
  label: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.quickAction, { borderLeftColor: color }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text style={[styles.quickActionLabel, { color }]}>{label}</Text>
      {subtitle ? <Text style={styles.quickActionSub}>{subtitle}</Text> : null}
    </TouchableOpacity>
  );
}

export default function OwnerDashboardScreen() {
  const user = useAuthStore((s) => s.user);

  const occupancyQuery = useQuery({
    queryKey: ['dashboard', 'occupancy'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/occupancy');
      return (res.data?.data ?? res.data) as OccupancyData;
    },
  });

  const paymentsQuery = useQuery({
    queryKey: ['dashboard', 'payments-summary'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/payments-summary');
      return (res.data?.data ?? res.data) as PaymentsSummary;
    },
  });

  const maintenanceQuery = useQuery({
    queryKey: ['dashboard', 'maintenance-summary'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/maintenance-summary');
      return (res.data?.data ?? res.data) as MaintenanceSummary;
    },
  });

  const alertsQuery = useQuery({
    queryKey: ['dashboard', 'alerts'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/alerts');
      return (res.data?.data ?? res.data) as AlertsData;
    },
  });

  const isAnyLoading =
    occupancyQuery.isLoading ||
    paymentsQuery.isLoading ||
    maintenanceQuery.isLoading ||
    alertsQuery.isLoading;

  const refetchAll = () => {
    occupancyQuery.refetch();
    paymentsQuery.refetch();
    maintenanceQuery.refetch();
    alertsQuery.refetch();
  };

  const isRefreshing =
    occupancyQuery.isRefetching ||
    paymentsQuery.isRefetching ||
    maintenanceQuery.isRefetching ||
    alertsQuery.isRefetching;

  const occ = occupancyQuery.data;
  const pay = paymentsQuery.data;
  const mnt = maintenanceQuery.data;
  const alerts = alertsQuery.data;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refetchAll} tintColor="#2563EB" />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Header */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>
          Good day{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </Text>
        <Text style={styles.dateText}>{today}</Text>
      </View>

      {/* Alerts Banner */}
      {alerts && alerts.count > 0 && (
        <View style={styles.alertsBanner}>
          <View style={styles.alertsLeft}>
            <Text style={styles.alertsIcon}>🔔</Text>
            <View>
              <Text style={styles.alertsTitle}>{alerts.count} Alert{alerts.count !== 1 ? 's' : ''}</Text>
              <Text style={styles.alertsSub}>Require your attention</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.alertsBtn} onPress={() => router.push('/dashboard/alerts' as any)}>
            <Text style={styles.alertsBtnText}>View</Text>
          </TouchableOpacity>
        </View>
      )}

      {isAnyLoading && !occ && !pay && !mnt ? (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : (
        <>
          {/* Occupancy Card */}
          <SectionHeader title="Occupancy" />
          <View style={styles.cardRow}>
            <Card style={styles.cardFlex}>
              <CardTitle>Total Units</CardTitle>
              <CardValue>{occ?.total ?? '—'}</CardValue>
              <CardLabel>across all properties</CardLabel>
            </Card>
            <Card style={styles.cardFlex}>
              <CardTitle>Occupancy Rate</CardTitle>
              <CardValue color={
                (occ?.occupancy_rate ?? 0) >= 80 ? '#16a34a' : '#854d0e'
              }>
                {occ?.occupancy_rate != null ? `${Math.round(occ.occupancy_rate)}%` : '—'}
              </CardValue>
              <CardLabel>{occ?.occupied ?? 0} occupied / {occ?.vacant ?? 0} vacant</CardLabel>
            </Card>
          </View>

          {/* Occupancy Progress */}
          {occ && occ.total > 0 && (
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Unit Occupancy</Text>
                <Text style={styles.progressPct}>{Math.round(occ.occupancy_rate)}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(occ.occupancy_rate, 100)}%` as any,
                      backgroundColor: occ.occupancy_rate >= 80 ? '#16a34a' : '#f59e0b',
                    },
                  ]}
                />
              </View>
              <View style={styles.progressLegend}>
                <Text style={styles.legendOccupied}>Occupied: {occ.occupied}</Text>
                <Text style={styles.legendVacant}>Vacant: {occ.vacant}</Text>
              </View>
            </View>
          )}

          {/* Payments Summary */}
          <SectionHeader title="Payments This Month" />
          <View style={styles.cardRow}>
            <Card style={styles.cardFlex}>
              <CardTitle>Collected</CardTitle>
              <CardValue color="#16a34a">
                {pay?.collected != null ? `AED ${Number(pay.collected).toLocaleString()}` : '—'}
              </CardValue>
              <CardLabel>
                {pay?.collection_rate != null
                  ? `${Math.round(pay.collection_rate)}% collection rate`
                  : ''}
              </CardLabel>
            </Card>
            <Card style={styles.cardFlex}>
              <CardTitle>Outstanding</CardTitle>
              <CardValue color="#dc2626">
                {pay?.due != null ? `AED ${Number(pay.due).toLocaleString()}` : '—'}
              </CardValue>
              <CardLabel>
                {pay?.overdue_count != null && pay.overdue_count > 0
                  ? `${pay.overdue_count} overdue`
                  : 'No overdue'}
              </CardLabel>
            </Card>
          </View>

          {/* Maintenance Summary */}
          <SectionHeader title="Maintenance" />
          <View style={styles.cardRow}>
            <Card style={styles.cardFlex}>
              <CardTitle>Pending Approvals</CardTitle>
              <CardValue color={
                (mnt?.pending_approvals ?? 0) > 0 ? '#f59e0b' : '#111827'
              }>
                {mnt?.pending_approvals ?? '—'}
              </CardValue>
              <CardLabel>cost approvals needed</CardLabel>
            </Card>
            <Card style={styles.cardFlex}>
              <CardTitle>Cost This Month</CardTitle>
              <CardValue>
                {mnt?.total_cost_this_month != null
                  ? `AED ${Number(mnt.total_cost_this_month).toLocaleString()}`
                  : '—'}
              </CardValue>
              <CardLabel>
                {mnt?.open_requests != null ? `${mnt.open_requests} open requests` : ''}
              </CardLabel>
            </Card>
          </View>

          {/* Quick Actions */}
          <SectionHeader title="Quick Actions" />
          <View style={styles.quickActionsContainer}>
            <QuickActionButton
              label="Review Receipts"
              subtitle={`Pending payment receipts`}
              onPress={() => router.push('/payments/pending')}
              color="#2563EB"
            />
            <QuickActionButton
              label="Approve Costs"
              subtitle={
                mnt?.pending_approvals
                  ? `${mnt.pending_approvals} awaiting approval`
                  : 'No pending approvals'
              }
              onPress={() => router.push('/maintenance/approvals')}
              color="#16a34a"
            />
            <QuickActionButton
              label="Browse Units"
              subtitle={
                occ ? `${occ.total} units — ${occ.vacant} vacant` : 'View all units'
              }
              onPress={() => router.push('/units')}
              color="#7c3aed"
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },

  welcomeSection: { marginBottom: 20 },
  welcomeText: { fontSize: 22, fontWeight: '700', color: '#111827' },
  dateText: { fontSize: 13, color: '#9ca3af', marginTop: 2 },

  alertsBanner: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  alertsLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  alertsIcon: { fontSize: 20 },
  alertsTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  alertsSub: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  alertsBtn: {
    backgroundColor: '#fef9c3',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  alertsBtnText: { fontSize: 13, fontWeight: '600', color: '#854d0e' },

  loadingSection: { alignItems: 'center', paddingVertical: 48 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6b7280' },

  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },

  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  cardFlex: { flex: 1 },

  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressTitle: { fontSize: 14, fontWeight: '600', color: '#374151' },
  progressPct: { fontSize: 14, fontWeight: '600', color: '#111827' },
  progressBarBg: { height: 10, backgroundColor: '#e5e7eb', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },
  progressLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  legendOccupied: { fontSize: 12, color: '#16a34a', fontWeight: '500' },
  legendVacant: { fontSize: 12, color: '#854d0e', fontWeight: '500' },

  quickActionsContainer: { gap: 10, marginBottom: 12 },
  quickAction: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  quickActionLabel: { fontSize: 15, fontWeight: '700' },
  quickActionSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
});
