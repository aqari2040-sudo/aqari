import { View, Text, StyleSheet } from 'react-native';

export function EmptyState({ message = 'No data found' }: { message?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },
  text: { fontSize: 14, color: '#9ca3af' },
});
