import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({ children, onPress, style }: CardProps) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={[styles.card, style]} onPress={onPress} activeOpacity={0.7}>
      {children}
    </Wrapper>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function CardValue({ children, color }: { children: React.ReactNode; color?: string }) {
  return <Text style={[styles.value, color ? { color } : undefined]}>{children}</Text>;
}

export function CardLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  value: { fontSize: 24, fontWeight: '700', color: '#111827' },
  label: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});
