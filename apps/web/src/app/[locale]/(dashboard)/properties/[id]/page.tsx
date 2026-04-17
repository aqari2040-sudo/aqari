'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Trash2, Plus } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { CurrencyDisplay } from '@/components/shared/currency-display';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DataTable, type Column } from '@/components/shared/data-table';
import { PageSpinner } from '@/components/shared/spinner';
import { useAuthStore } from '@/stores/auth-store';

export default function PropertyDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  const t = useTranslations('properties');
  const tu = useTranslations('units');
  const tc = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      const res = await apiClient.get(`/properties/${id}`);
      return res.data;
    },
  });

  const { data: unitsData } = useQuery({
    queryKey: ['property-units', id],
    queryFn: async () => {
      const res = await apiClient.get(`/properties/${id}/units`);
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/properties/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      router.push(`/${locale}/properties`);
    },
  });

  const unitColumns: Column<any>[] = [
    { key: 'unit_number', header: tu('unit_number'), sortable: true },
    {
      key: 'status',
      header: tc('status'),
      render: (item) => <StatusBadge status={item.status} locale={locale} />,
    },
    {
      key: 'base_rent',
      header: tu('base_rent'),
      render: (item) => <CurrencyDisplay amount={Number(item.base_rent)} locale={locale as 'en' | 'ar'} />,
    },
    { key: 'bedrooms', header: tu('bedrooms') },
    { key: 'bathrooms', header: tu('bathrooms') },
  ];

  if (isLoading) {
    return <PageSpinner />;
  }

  if (!property) return null;

  const summary = property.units_summary || {};

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/${locale}/properties`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{locale === 'ar' ? property.name_ar : property.name}</h1>
            <p className="text-sm text-muted-foreground">
              {locale === 'ar' ? property.address_ar : property.address}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/${locale}/properties/${id}/edit`)}>
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

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Units</p>
            <p className="text-2xl font-bold">{summary.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Occupied</p>
            <p className="text-2xl font-bold text-green-600">{summary.occupied || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Vacant</p>
            <p className="text-2xl font-bold text-yellow-600">{summary.vacant || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Under Maintenance</p>
            <p className="text-2xl font-bold text-red-600">{summary.under_maintenance || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Units table */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{tu('title')}</h2>
        <Button size="sm" onClick={() => router.push(`/${locale}/units/new?property_id=${id}`)}>
          <Plus className="me-2 h-3.5 w-3.5" />
          {tu('add')}
        </Button>
      </div>

      <DataTable
        columns={unitColumns}
        data={Array.isArray(unitsData) ? unitsData : (unitsData?.data || [])}
        total={Array.isArray(unitsData) ? unitsData.length : (unitsData?.meta?.total || unitsData?.data?.length || 0)}
        onRowClick={(item) => router.push(`/${locale}/units/${item.id}`)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={`${tc('delete')} ${property.name}?`}
        description="This will archive the property and all its units. This action cannot be easily undone."
        confirmLabel={tc('delete')}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
