'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSpinner } from '@/components/shared/spinner';

const settingLabels: Record<string, { label: string; description: string; type: 'number' }> = {
  duplicate_maintenance_window_days: {
    label: 'Duplicate Maintenance Window (days)',
    description: 'Time window to check for duplicate maintenance requests on the same unit + category.',
    type: 'number',
  },
  ocr_confidence_threshold: {
    label: 'OCR Confidence Threshold',
    description: 'Below this value (0-1), receipts are flagged for manual review.',
    type: 'number',
  },
  default_grace_period_days: {
    label: 'Default Grace Period (days)',
    description: 'Number of days after due date before a payment is marked overdue.',
    type: 'number',
  },
  recurring_maintenance_threshold: {
    label: 'Recurring Maintenance Threshold',
    description: 'Number of requests that triggers a recurring maintenance alert.',
    type: 'number',
  },
  recurring_maintenance_window_days: {
    label: 'Recurring Maintenance Window (days)',
    description: 'Time window for counting recurring maintenance requests.',
    type: 'number',
  },
  suspicious_cost_multiplier: {
    label: 'Suspicious Cost Multiplier',
    description: 'Flag maintenance costs exceeding this multiple of the unit average.',
    type: 'number',
  },
  max_file_size_mb: {
    label: 'Max File Upload Size (MB)',
    description: 'Maximum file size for receipt and document uploads.',
    type: 'number',
  },
};

export default function SettingsPage() {
  const tc = useTranslations('common');
  const queryClient = useQueryClient();
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await apiClient.get('/settings');
      return res.data;
    },
  });

  useEffect(() => {
    if (settings) {
      const values: Record<string, string> = {};
      for (const s of settings) {
        values[s.key] = String(s.value);
      }
      setEditValues(values);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) =>
      apiClient.patch(`/settings/${key}`, { value }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSavedKey(vars.key);
      setTimeout(() => setSavedKey(null), 2000);
    },
  });

  if (isLoading) {
    return <PageSpinner />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="space-y-4">
        {Object.entries(settingLabels).map(([key, meta]) => (
          <Card key={key}>
            <CardContent className="flex items-start justify-between gap-4 p-4">
              <div className="flex-1">
                <h3 className="text-sm font-medium">{meta.label}</h3>
                <p className="text-xs text-muted-foreground">{meta.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step={key === 'ocr_confidence_threshold' || key === 'suspicious_cost_multiplier' ? '0.1' : '1'}
                  value={editValues[key] || ''}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-24 text-center"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateMutation.mutate({ key, value: Number(editValues[key]) })}
                  disabled={updateMutation.isPending}
                >
                  {savedKey === key ? (
                    <span className="text-green-600 text-xs">Saved</span>
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
