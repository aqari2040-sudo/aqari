import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

interface Tenant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  lease_end?: string;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  status: string;
  type?: string;
}

interface MaintenanceReq {
  id: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
}

interface UnitDetail {
  id: string;
  unit_number: string;
  property_name: string;
  status: string;
  base_rent: number;
  size?: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: number;
  current_tenant?: Tenant | null;
  maintenance_budget?: number | null;
  maintenance_spent?: number | null;
  recent_payments?: Payment[];
  recent_maintenance?: MaintenanceReq[];
}

type Tab = 'payments' | 'maintenance';

function InfoRow({ label, value }: { label: string; value: string | number | undefined | null }) {
  if (value == null || value === '') return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function BudgetProgress({ spent, budget }: { spent: number; budget: number }) {
  const pct = Math.min((spent / budget) * 100, 100);
  const color = pct >= 90 ? '#dc2626' : pct >= 70 ? '#f59e0b' : '#16a34a';
  return (
    <View style={styles.budgetSection}>
      <View style={styles.budgetRow}>
        <Text style={styles.budgetLabel}>Maintenance Budget</Text>
        <Text style={styles.budgetPct}>{Math.round(pct)}% used</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <View style={styles.budgetNumbers}>
        <Text style={styles.budgetSpent}>AED {Number(spent).toLocaleString()} spent</Text>
        <Text style={styles.budgetTotal}>of AED {Number(budget).toLocaleString()}</Text>
      </View>
    </View>
  );
}

export default function UnitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('payments');

  const { data: unit, isLoading, isError } = useQuery({
    queryKey: ['unit', id],
    queryFn: async () => {
      const res = await apiClient.get(`/units/${id}`);
      return (res.data?.data ?? res.data) as UnitDetail;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading unit details...</Text>
      </View>
    );
  }

  if (isError || !unit) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load unit details.</Text>
        <Button title="Go Back" onPress={() => router.back()} variant="outline" style={{ marginTop: 16 }} />
      </View>
    );
  }

  const payments = unit.recent_payments ?? [];
  const maintenance = unit.recent_maintenance ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.unitHeader}>
        <View>
          <Text style={styles.unitNumber}>Unit {unit.unit_number}</Text>
          <Text style={styles.propertyName}>{unit.property_name}</Text>
        </View>
        <StatusBadge status={unit.status} />
      </View>

      {/* Unit Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Unit Details</Text>
        <View style={styles.card}>
          <InfoRow label="Base Rent" value={`AED ${Number(unit.base_rent).toLocaleString()} / year`} />
          {unit.bedrooms != null && <View style={styles.divider} />}
          <InfoRow label="Bedrooms" value={unit.bedrooms} />
          {unit.bathrooms != null && <View style={styles.divider} />}
          <InfoRow label="Bathrooms" value={unit.bathrooms} />
          {unit.size != null && <View style={styles.divider} />}
          <InfoRow label="Size" value={unit.size ? `${unit.size} m²` : undefined} />
          {unit.floor != null && <View style={styles.divider} />}
          <InfoRow label="Floor" value={unit.floor} />
        </View>
      </View>

      {/* Budget Progress */}
      {unit.maintenance_budget != null && unit.maintenance_spent != null && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Maintenance Budget</Text>
          <View style={styles.card}>
            <BudgetProgress
              spent={unit.maintenance_spent}
              budget={unit.maintenance_budget}
            />
          </View>
        </View>
      )}

      {/* Current Tenant */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Tenant</Text>
        {unit.current_tenant ? (
          <View style={styles.card}>
            <View style={styles.tenantHeader}>
              <View style={styles.tenantAvatar}>
                <Text style={styles.tenantInitial}>
                  {unit.current_tenant.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.tenantInfo}>
                <Text style={styles.tenantName}>{unit.current_tenant.name}</Text>
                {unit.current_tenant.email ? (
                  <Text style={styles.tenantContact}>{unit.current_tenant.email}</Text>
                ) : null}
                {unit.current_tenant.phone ? (
                  <Text style={styles.tenantContact}>{unit.current_tenant.phone}</Text>
                ) : null}
              </View>
            </View>
            {unit.current_tenant.lease_end && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Lease Ends</Text>
                  <Text style={styles.infoValue}>
                    {new Date(unit.current_tenant.lease_end).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </>
            )}
          </View>
        ) : (
          <View style={[styles.card, styles.vacantCard]}>
            <Text style={styles.vacantText}>No current tenant — unit is vacant.</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payments' && styles.tabActive]}
          onPress={() => setActiveTab('payments')}
        >
          <Text style={[styles.tabText, activeTab === 'payments' && styles.tabTextActive]}>
            Payments ({payments.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'maintenance' && styles.tabActive]}
          onPress={() => setActiveTab('maintenance')}
        >
          <Text style={[styles.tabText, activeTab === 'maintenance' && styles.tabTextActive]}>
            Maintenance ({maintenance.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <View style={styles.tabContent}>
          {payments.length === 0 ? (
            <EmptyState message="No recent payments." />
          ) : (
            payments.map((p) => (
              <View key={p.id} style={styles.listItem}>
                <View>
                  <Text style={styles.listItemTitle}>
                    {p.type ?? 'Payment'}
                  </Text>
                  <Text style={styles.listItemSub}>
                    {new Date(p.payment_date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.listItemRight}>
                  <Text style={styles.listItemAmount}>
                    AED {Number(p.amount).toLocaleString()}
                  </Text>
                  <StatusBadge status={p.status} />
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <View style={styles.tabContent}>
          {maintenance.length === 0 ? (
            <EmptyState message="No recent maintenance requests." />
          ) : (
            maintenance.map((m) => (
              <View key={m.id} style={styles.listItem}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.listItemTitle} numberOfLines={1}>
                    {m.description}
                  </Text>
                  <View style={styles.maintenanceMeta}>
                    <View style={styles.categoryChip}>
                      <Text style={styles.categoryText}>{m.category}</Text>
                    </View>
                    <Text style={styles.listItemSub}>
                      {new Date(m.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
                <StatusBadge status={m.status} />
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6b7280' },
  errorText: { fontSize: 14, color: '#991b1b', textAlign: 'center' },

  unitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 20,
  },
  unitNumber: { fontSize: 22, fontWeight: '700', color: '#111827' },
  propertyName: { fontSize: 14, color: '#6b7280', marginTop: 2 },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 8 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  infoLabel: { fontSize: 14, color: '#6b7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827' },

  budgetSection: {},
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  budgetLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },
  budgetPct: { fontSize: 14, color: '#6b7280' },
  progressBarBg: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  budgetNumbers: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  budgetSpent: { fontSize: 13, color: '#dc2626', fontWeight: '500' },
  budgetTotal: { fontSize: 13, color: '#6b7280' },

  tenantHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tenantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tenantInitial: { fontSize: 18, fontWeight: '700', color: '#2563EB' },
  tenantInfo: { flex: 1 },
  tenantName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  tenantContact: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  vacantCard: { alignItems: 'center', paddingVertical: 20 },
  vacantText: { fontSize: 14, color: '#9ca3af' },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
    overflow: 'hidden',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#2563EB' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  tabTextActive: { color: '#fff', fontWeight: '600' },

  tabContent: { gap: 10 },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 3 },
  listItemSub: { fontSize: 12, color: '#9ca3af' },
  listItemRight: { alignItems: 'flex-end', gap: 6 },
  listItemAmount: { fontSize: 15, fontWeight: '700', color: '#2563EB' },

  maintenanceMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  categoryChip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: { fontSize: 11, color: '#374151', fontWeight: '500' },
});
