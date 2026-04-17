import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth-store';
import { initI18n } from '../i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
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
      <Stack
        screenOptions={{
          headerShown: true,
          headerBackTitleVisible: false,
          headerTintColor: '#2563EB',
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { fontSize: 17, fontWeight: '600' },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="payments/upload-receipt" options={{ title: 'Upload Receipt' }} />
        <Stack.Screen name="payments/pending" options={{ title: 'Pending Receipts' }} />
        <Stack.Screen name="payments/[id]" options={{ title: 'Payment' }} />
        <Stack.Screen name="payments/review/[id]" options={{ title: 'Review Receipt' }} />
        <Stack.Screen name="maintenance/new-request" options={{ title: 'New Request' }} />
        <Stack.Screen name="maintenance/approvals" options={{ title: 'Cost Approvals' }} />
        <Stack.Screen name="maintenance/add-cost/[id]" options={{ title: 'Add Cost' }} />
        <Stack.Screen name="maintenance/[id]" options={{ title: 'Maintenance' }} />
        <Stack.Screen name="contract/index" options={{ title: 'My Contract' }} />
        <Stack.Screen name="units/index" options={{ title: 'Units' }} />
        <Stack.Screen name="units/[id]" options={{ title: 'Unit' }} />
        <Stack.Screen name="dashboard/index" options={{ title: 'Dashboard' }} />
      </Stack>
    </QueryClientProvider>
  );
}
