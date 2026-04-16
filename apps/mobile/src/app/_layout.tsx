import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth-store';
import { initI18n } from '../i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1 },
  },
});

export default function RootLayout() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initI18n();
    initialize();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="payments" options={{ headerShown: true, headerTitle: 'Payments' }} />
        <Stack.Screen name="maintenance" options={{ headerShown: true, headerTitle: 'Maintenance' }} />
        <Stack.Screen name="contract" options={{ headerShown: true, headerTitle: 'Contract' }} />
        <Stack.Screen name="units" options={{ headerShown: true, headerTitle: 'Units' }} />
        <Stack.Screen name="dashboard" options={{ headerShown: true, headerTitle: 'Dashboard' }} />
      </Stack>
    </QueryClientProvider>
  );
}
