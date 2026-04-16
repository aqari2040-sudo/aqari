import { View, Text, StyleSheet } from 'react-native';

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  occupied: { bg: '#dcfce7', text: '#166534', label: 'Occupied' },
  vacant: { bg: '#fef9c3', text: '#854d0e', label: 'Vacant' },
  under_maintenance: { bg: '#fee2e2', text: '#991b1b', label: 'Under Maintenance' },
  active: { bg: '#dcfce7', text: '#166534', label: 'Active' },
  expired: { bg: '#e5e7eb', text: '#374151', label: 'Expired' },
  terminated: { bg: '#fee2e2', text: '#991b1b', label: 'Terminated' },
  pending: { bg: '#fef9c3', text: '#854d0e', label: 'Pending' },
  partial: { bg: '#fef9c3', text: '#854d0e', label: 'Partial' },
  paid: { bg: '#dcfce7', text: '#166534', label: 'Paid' },
  overdue: { bg: '#fee2e2', text: '#991b1b', label: 'Overdue' },
  pending_review: { bg: '#fef9c3', text: '#854d0e', label: 'Pending Review' },
  confirmed: { bg: '#dcfce7', text: '#166534', label: 'Confirmed' },
  rejected: { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' },
  submitted: { bg: '#dbeafe', text: '#1e40af', label: 'Submitted' },
  in_progress: { bg: '#dbeafe', text: '#1e40af', label: 'In Progress' },
  approved: { bg: '#dcfce7', text: '#166534', label: 'Approved' },
  completed: { bg: '#dcfce7', text: '#166534', label: 'Completed' },
  blocked_duplicate: { bg: '#fee2e2', text: '#991b1b', label: 'Blocked' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { bg: '#e5e7eb', text: '#374151', label: status };
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  text: { fontSize: 11, fontWeight: '600' },
});
