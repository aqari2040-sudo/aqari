'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createContractSchema, type CreateContractSchema } from '@aqari/shared';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewContractPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('contracts');
  const tc = useTranslations('common');
  const router = useRouter();

  const { data: tenants } = useQuery({
    queryKey: ['tenants-list'],
    queryFn: async () => {
      const res = await apiClient.get('/tenants', { params: { limit: 200 } });
      return res.data?.data || [];
    },
  });

  const { data: units } = useQuery({
    queryKey: ['units-vacant'],
    queryFn: async () => {
      const res = await apiClient.get('/units', { params: { status: 'vacant', limit: 200 } });
      return res.data?.data || [];
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateContractSchema>({
    resolver: zodResolver(createContractSchema),
    defaultValues: {
      payment_frequency: 'monthly',
      grace_period_days: 7,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateContractSchema) => apiClient.post('/contracts', data),
    onSuccess: () => router.push(`/${locale}/contracts`),
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Tenant</label>
                <select
                  {...register('tenant_id')}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Select tenant...</option>
                  {(tenants || []).map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {locale === 'ar' ? t.full_name_ar : t.full_name} — {t.phone}
                    </option>
                  ))}
                </select>
                {errors.tenant_id && <p className="mt-1 text-xs text-destructive">{errors.tenant_id.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Unit (Vacant)</label>
                <select
                  {...register('unit_id')}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Select unit...</option>
                  {(units || []).map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.unit_number} — {locale === 'ar' ? u.property?.name_ar : u.property?.name}
                    </option>
                  ))}
                </select>
                {errors.unit_id && <p className="mt-1 text-xs text-destructive">{errors.unit_id.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('start_date')}</label>
                <Input {...register('start_date')} type="date" />
                {errors.start_date && <p className="mt-1 text-xs text-destructive">{errors.start_date.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('end_date')}</label>
                <Input {...register('end_date')} type="date" />
                {errors.end_date && <p className="mt-1 text-xs text-destructive">{errors.end_date.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('rent_amount')}</label>
                <Input {...register('rent_amount', { valueAsNumber: true })} type="number" step="0.01" placeholder="5000" />
                {errors.rent_amount && <p className="mt-1 text-xs text-destructive">{errors.rent_amount.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('frequency')}</label>
                <select
                  {...register('payment_frequency')}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('grace_period')}</label>
                <Input {...register('grace_period_days', { valueAsNumber: true })} type="number" min="0" />
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
                {(mutation.error as any)?.response?.data?.message || 'Failed to create contract.'}
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
