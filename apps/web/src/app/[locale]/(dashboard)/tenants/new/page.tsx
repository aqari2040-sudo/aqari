'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTenantSchema, type CreateTenantSchema } from '@aqari/shared';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewTenantPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('tenants');
  const tc = useTranslations('common');
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTenantSchema>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: { id_type: 'emirates_id' },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateTenantSchema) => apiClient.post('/tenants', data),
    onSuccess: () => router.push(`/${locale}/tenants`),
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
                <label className="mb-1.5 block text-sm font-medium">{t('full_name')}</label>
                <Input {...register('full_name')} placeholder="Ahmed Al Mansouri" />
                {errors.full_name && <p className="mt-1 text-xs text-destructive">{errors.full_name.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('full_name_ar')}</label>
                <Input {...register('full_name_ar')} placeholder="أحمد المنصوري" dir="rtl" />
                {errors.full_name_ar && <p className="mt-1 text-xs text-destructive">{errors.full_name_ar.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('id_type')}</label>
                <select
                  {...register('id_type')}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="emirates_id">{t('emirates_id')}</option>
                  <option value="passport">{t('passport')}</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('id_number')}</label>
                <Input {...register('id_number')} placeholder="784-XXXX-XXXXXXX-X" dir="ltr" />
                {errors.id_number && <p className="mt-1 text-xs text-destructive">{errors.id_number.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('phone')}</label>
                <Input {...register('phone')} placeholder="+971501234567" dir="ltr" />
                {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('email')}</label>
                <Input {...register('email')} type="email" placeholder="ahmed@email.com" dir="ltr" />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t('emergency_contact')}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Name</label>
                  <Input {...register('emergency_contact_name')} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Phone</label>
                  <Input {...register('emergency_contact_phone')} placeholder="+971501234567" dir="ltr" />
                  {errors.emergency_contact_phone && (
                    <p className="mt-1 text-xs text-destructive">{errors.emergency_contact_phone.message}</p>
                  )}
                </div>
              </div>
            </div>

            {mutation.isError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {(mutation.error as any)?.response?.data?.message || 'Failed to create tenant.'}
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
