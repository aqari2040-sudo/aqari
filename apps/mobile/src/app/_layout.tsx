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
          headerShown: false,
          headerBackTitleVisible: false,
          headerTintColor: '#2563EB',
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { fontSize: 17, fontWeight: '600' },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Payments stack */}
        <Stack.Screen name="payments/upload-receipt" options={{ headerShown: true, title: 'Upload Receipt', presentation: 'modal' }} />
        <Stack.Screen name="payments/pending" options={{ headerShown: true, title: 'Pending Receipts' }} />
        <Stack.Screen name="payments/[id]" options={{ headerShown: true, title: 'Payment' }} />
        <Stack.Screen name="payments/review/[id]" options={{ headerShown: true, title: 'Review Receipt' }} />

        {/* Maintenance stack */}
        <Stack.Screen name="maintenance/new-request" options={{ headerShown: true, title: 'New Request', presentation: 'modal' }} />
        <Stack.Screen name="maintenance/approvals" options={{ headerShown: true, title: 'Cost Approvals' }} />
        <Stack.Screen name="maintenance/add-cost/[id]" options={{ headerShown: true, title: 'Add Cost', presentation: 'modal' }} />
        <Stack.Screen name="maintenance/[id]" options={{ headerShown: true, title: 'Maintenance' }} />

        {/* Contract / Units / Dashboard */}
        <Stack.Screen name="contract/index" options={{ headerShown: true, title: 'My Contract' }} />
        <Stack.Screen name="units/index" options={{ headerShown: true, title: 'Units' }} />
        <Stack.Screen name="units/[id]" options={{ headerShown: true, title: 'Unit' }} />
        <Stack.Screen name="dashboard/index" options={{ headerShown: true, title: 'Dashboard' }} />
      </Stack>
    </QueryClientProvider>
  );
}
