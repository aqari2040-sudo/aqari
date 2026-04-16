import { View, Text, StyleSheet, TouchableOpacity, Alert, I18nManager } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../stores/auth-store';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import i18n from '../../i18n';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    const isRTL = newLang === 'ar';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
      Alert.alert(
        'Restart Required',
        'Please restart the app to apply the language change.',
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* User info */}
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name || user?.email || 'U')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name || 'User'}</Text>
        <Text style={styles.role}>{user?.role?.toUpperCase()}</Text>
        {user?.email && <Text style={styles.detail}>{user.email}</Text>}
        {user?.phone && <Text style={styles.detail}>{user.phone}</Text>}
      </Card>

      {/* Quick links */}
      <View style={styles.section}>
        {user?.role === 'tenant' && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/contract')}
          >
            <Text style={styles.menuText}>My Contract</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>
        )}

        {(user?.role === 'owner' || user?.role === 'employee') && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/units')}
          >
            <Text style={styles.menuText}>Browse Units</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>
        )}

        {user?.role === 'owner' && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/dashboard')}
          >
            <Text style={styles.menuText}>Dashboard</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Language toggle */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem} onPress={toggleLanguage}>
          <Text style={styles.menuText}>Language</Text>
          <Text style={styles.menuValue}>
            {i18n.language === 'ar' ? 'العربية → English' : 'English → العربية'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <View style={styles.logoutSection}>
        <Button title="Logout" variant="destructive" onPress={handleLogout} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  profileCard: { alignItems: 'center', marginBottom: 16, paddingVertical: 24 },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#fff' },
  name: { fontSize: 18, fontWeight: '700', color: '#111827' },
  role: { fontSize: 12, fontWeight: '600', color: '#2563EB', marginTop: 4, letterSpacing: 1 },
  detail: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  section: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#e5e7eb', marginBottom: 16, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  menuText: { fontSize: 15, color: '#111827' },
  menuArrow: { fontSize: 16, color: '#9ca3af' },
  menuValue: { fontSize: 13, color: '#6b7280' },
  logoutSection: { marginTop: 8 },
});
