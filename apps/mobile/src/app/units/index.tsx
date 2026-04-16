import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';

interface Unit {
  id: string;
  unit_number: string;
  property_name: string;
  status: string;
  base_rent: number;
  size?: number;
  bedrooms?: number;
  bathrooms?: number;
}

function UnitCard({ unit }: { unit: Unit }) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/units/${unit.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.unitNumber}>Unit {unit.unit_number}</Text>
          <Text style={styles.propertyName}>{unit.property_name}</Text>
        </View>
        <StatusBadge status={unit.status} />
      </View>

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        <View style={styles.rentBlock}>
          <Text style={styles.rentLabel}>Base Rent</Text>
          <Text style={styles.rentValue}>AED {Number(unit.base_rent).toLocaleString()}</Text>
          <Text style={styles.rentPeriod}>/ year</Text>
        </View>

        {(unit.bedrooms != null || unit.size != null) && (
          <View style={styles.specs}>
            {unit.bedrooms != null && (
              <View style={styles.specChip}>
                <Text style={styles.specText}>{unit.bedrooms} BR</Text>
              </View>
            )}
            {unit.bathrooms != null && (
              <View style={styles.specChip}>
                <Text style={styles.specText}>{unit.bathrooms} BA</Text>
              </View>
            )}
            {unit.size != null && (
              <View style={styles.specChip}>
                <Text style={styles.specText}>{unit.size} m²</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function UnitsScreen() {
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const res = await apiClient.get('/units');
      return (res.data?.data ?? res.data) as Unit[];
    },
  });

  const units = data ?? [];

  const filtered = search.trim()
    ? units.filter(
        (u) =>
          u.unit_number.toLowerCase().includes(search.toLowerCase()) ||
          u.property_name.toLowerCase().includes(search.toLowerCase())
      )
    : units;

  const statusCounts = {
    total: units.length,
    occupied: units.filter((u) => u.status === 'occupied').length,
    vacant: units.filter((u) => u.status === 'vacant').length,
  };

  return (
    <View style={styles.container}>
      {/* Header + Stats */}
      <View style={styles.headerSection}>
        <Text style={styles.screenTitle}>Units</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statusCounts.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#16a34a' }]}>{statusCounts.occupied}</Text>
            <Text style={styles.statLabel}>Occupied</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#854d0e' }]}>{statusCounts.vacant}</Text>
            <Text style={styles.statLabel}>Vacant</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by unit or property..."
          placeholderTextColor="#9ca3af"
          clearButtonMode="while-editing"
        />
      </View>

      {isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Failed to load units. Pull to retry.</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <UnitCard unit={item} />}
        contentContainerStyle={[
          styles.list,
          filtered.length === 0 && styles.listEmpty,
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
            <EmptyState message="Loading units..." />
          ) : search.trim() ? (
            <EmptyState message={`No units match "${search}"`} />
          ) : (
            <EmptyState message="No units found." />
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
  screenTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 12 },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#e5e7eb' },

  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },

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
  unitNumber: { fontSize: 17, fontWeight: '700', color: '#111827' },
  propertyName: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  rentBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  rentLabel: { fontSize: 13, color: '#6b7280' },
  rentValue: { fontSize: 16, fontWeight: '700', color: '#2563EB' },
  rentPeriod: { fontSize: 12, color: '#9ca3af' },

  specs: { flexDirection: 'row', gap: 6 },
  specChip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  specText: { fontSize: 12, color: '#374151', fontWeight: '500' },
});
