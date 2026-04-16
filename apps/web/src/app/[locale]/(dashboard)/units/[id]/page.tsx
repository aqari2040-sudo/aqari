'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { CurrencyDisplay } from '@/components/shared/currency-display';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useAuthStore } from '@/stores/auth-store';

export default function UnitDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  const t = useTranslations('units');
  const tc = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'payments' | 'maintenance' | 'contracts'>('info');

  const { data: unit, isLoading } = useQuery({
    queryKey: ['unit', id],
    queryFn: async () => {
      const res = await apiClient.get(`/units/${id}`);
      return res.data;
    },
  });

  const { data: history } = useQuery({
    queryKey: ['unit-history', id, activeTab],
    queryFn: async () => {
      if (activeTab === 'info') return null;
      const res = await apiClient.get(`/units/${id}/history`, { params: { type: activeTab } });
      return res.data;
    },
    enabled: activeTab !== 'info',
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/units/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      router.push(`/${locale}/units`);
    },
  });

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">{tc('loading')}</div>;
  }

  if (!unit) return null;

  const tabs = [
    { key: 'info', label: 'Info' },
    { key: 'payments', label: 'Payments' },
    { key: 'maintenance', label: 'Maintenance' },
    { key: 'contracts', label: 'Contracts' },
  ] as const;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{unit.unit_number}</h1>
              <StatusBadge status={unit.status} locale={locale} />
            </div>
            <p className="text-sm text-muted-foreground">
              {locale === 'ar' ? unit.property?.name_ar : unit.property?.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/${locale}/units/${id}/edit`)}>
            <Pencil className="me-2 h-3.5 w-3.5" />
            {tc('edit')}
          </Button>
          {user?.role === 'owner' && (
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="me-2 h-3.5 w-3.5" />
              {tc('delete')}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'info' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('base_rent')}</p>
              <p className="text-xl font-bold">
                <CurrencyDisplay amount={Number(unit.base_rent)} locale={locale as 'en' | 'ar'} />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('size')}</p>
              <p className="text-xl font-bold">{Number(unit.size_sqft).toLocaleString()} sqft</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('bedrooms')} / {t('bathrooms')}</p>
              <p className="text-xl font-bold">{unit.bedrooms} / {unit.bathrooms}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('budget')}</p>
              <p className="text-xl font-bold">
                <CurrencyDisplay amount={Number(unit.maintenance_budget)} locale={locale as 'en' | 'ar'} />
              </p>
              <p className="text-xs capitalize text-muted-foreground">{unit.maintenance_budget_period}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Current Tenant</p>
              <p className="text-lg font-semibold">
                {unit.current_tenant
                  ? locale === 'ar' ? unit.current_tenant.full_name_ar : unit.current_tenant.full_name
                  : '—'}
              </p>
            </CardContent>
          </Card>
          {unit.notes && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{tc('notes')}</p>
                <p className="text-sm">{unit.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab !== 'info' && (
        <div className="rounded-md border p-4">
          {!history || history.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No {activeTab} history found.</p>
          ) : (
            <div className="space-y-3">
              {history.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {item.description || item.amount || item.rent_amount || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={item.status} locale={locale} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title={`${tc('delete')} Unit ${unit.unit_number}?`}
        description="This will archive this unit. It cannot have an active contract."
        confirmLabel={tc('delete')}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
