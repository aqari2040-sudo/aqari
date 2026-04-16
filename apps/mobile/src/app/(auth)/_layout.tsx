import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../stores/auth-store';

export default function AuthLayout() {
  const { user, isLoading } = useAuthStore();

  if (!isLoading && user) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
