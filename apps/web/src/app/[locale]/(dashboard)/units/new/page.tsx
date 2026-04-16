'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUnitSchema, type CreateUnitSchema } from '@aqari/shared';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewUnitPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('units');
  const tc = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPropertyId = searchParams.get('property_id') || '';

  const { data: properties } = useQuery({
    queryKey: ['properties-list'],
    queryFn: async () => {
      const res = await apiClient.get('/properties', { params: { limit: 100 } });
      return res.data?.data || [];
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUnitSchema>({
    resolver: zodResolver(createUnitSchema),
    defaultValues: {
      property_id: preselectedPropertyId,
      maintenance_budget_period: 'monthly',
      bedrooms: 1,
      bathrooms: 1,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateUnitSchema) => apiClient.post('/units', data),
    onSuccess: () => router.push(`/${locale}/units`),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">{t('add')}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('add')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Property</label>
              <select
                {...register('property_id')}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Select property...</option>
                {(properties || []).map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {locale === 'ar' ? p.name_ar : p.name}
                  </option>
                ))}
              </select>
              {errors.property_id && <p className="mt-1 text-xs text-destructive">{errors.property_id.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('unit_number')}</label>
                <Input {...register('unit_number')} placeholder="A-301" />
                {errors.unit_number && <p className="mt-1 text-xs text-destructive">{errors.unit_number.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('base_rent')}</label>
                <Input {...register('base_rent', { valueAsNumber: true })} type="number" step="0.01" placeholder="5000" />
                {errors.base_rent && <p className="mt-1 text-xs text-destructive">{errors.base_rent.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('size')}</label>
                <Input {...register('size_sqft', { valueAsNumber: true })} type="number" step="0.01" placeholder="850" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('bedrooms')}</label>
                <Input {...register('bedrooms', { valueAsNumber: true })} type="number" min="0" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('bathrooms')}</label>
                <Input {...register('bathrooms', { valueAsNumber: true })} type="number" min="0" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('budget')}</label>
                <Input {...register('maintenance_budget', { valueAsNumber: true })} type="number" step="0.01" placeholder="5000" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('budget_period')}</label>
                <select
                  {...register('maintenance_budget_period')}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">{tc('notes')}</label>
              <textarea
                {...register('notes')}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                rows={3}
              />
            </div>

            {mutation.isError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {(mutation.error as any)?.response?.data?.message || 'Failed to create unit.'}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? '...' : tc('create')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
