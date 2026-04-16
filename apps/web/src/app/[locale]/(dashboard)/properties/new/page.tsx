'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPropertySchema, type CreatePropertySchema } from '@aqari/shared';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewPropertyPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('properties');
  const tc = useTranslations('common');
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePropertySchema>({
    resolver: zodResolver(createPropertySchema),
    defaultValues: { type: 'tower' },
  });

  const mutation = useMutation({
    mutationFn: (data: CreatePropertySchema) => apiClient.post('/properties', data),
    onSuccess: () => router.push(`/${locale}/properties`),
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
                <label className="mb-1.5 block text-sm font-medium">{t('name')}</label>
                <Input {...register('name')} placeholder="Al Noor Tower" />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('name_ar')}</label>
                <Input {...register('name_ar')} placeholder="برج النور" dir="rtl" />
                {errors.name_ar && <p className="mt-1 text-xs text-destructive">{errors.name_ar.message}</p>}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">{t('type')}</label>
              <select
                {...register('type')}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="tower">{t('tower')}</option>
                <option value="house_group">{t('house_group')}</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('address')}</label>
                <Input {...register('address')} placeholder="Dubai, UAE" />
                {errors.address && <p className="mt-1 text-xs text-destructive">{errors.address.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('address_ar')}</label>
                <Input {...register('address_ar')} placeholder="دبي، الإمارات" dir="rtl" />
                {errors.address_ar && <p className="mt-1 text-xs text-destructive">{errors.address_ar.message}</p>}
              </div>
            </div>

            {mutation.isError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                Failed to create property. Please try again.
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
