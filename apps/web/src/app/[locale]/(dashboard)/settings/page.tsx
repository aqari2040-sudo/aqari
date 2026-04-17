'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { PageSpinner } from '@/components/shared/spinner';

const SETTING_KEYS = [
  'duplicate_maintenance_window_days',
  'ocr_confidence_threshold',
  'default_grace_period_days',
  'recurring_maintenance_threshold',
  'recurring_maintenance_window_days',
  'suspicious_cost_multiplier',
  'max_file_size_mb',
];

export default function SettingsPage() {
  const t = useTranslations('settings');
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
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      <div className="space-y-4">
        {SETTING_KEYS.map((key) => (
          <Card key={key}>
            <CardContent className="flex items-start justify-between gap-4 p-4">
              <div className="flex-1">
                <h3 className="text-sm font-medium">{t(`${key}_label`)}</h3>
                <p className="text-xs text-muted-foreground">{t(`${key}_desc`)}</p>
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
                    <span className="text-green-600 text-xs">{t('saved')}</span>
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
