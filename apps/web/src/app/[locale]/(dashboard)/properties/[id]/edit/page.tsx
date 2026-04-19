'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updatePropertySchema, type UpdatePropertySchema } from '@aqari/shared';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LocationPicker } from '@/components/map/location-picker';
import { MapPin, Trash2 } from 'lucide-react';
import { PageSpinner } from '@/components/shared/spinner';

export default function EditPropertyPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  const t = useTranslations('properties');
  const tc = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      const res = await apiClient.get(`/properties/${id}`);
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdatePropertySchema>({
    resolver: zodResolver(updatePropertySchema),
  });

  useEffect(() => {
    if (property) {
      reset({
        name: property.name,
        name_ar: property.name_ar,
        type: property.type,
        address: property.address,
        address_ar: property.address_ar,
      });
      if (property.latitude != null && property.longitude != null) {
        setLocation({ lat: property.latitude, lng: property.longitude });
      }
    }
  }, [property, reset]);

  const mutation = useMutation({
    mutationFn: (data: UpdatePropertySchema) =>
      apiClient.patch(`/properties/${id}`, {
        ...data,
        latitude: location?.lat ?? null,
        longitude: location?.lng ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', id] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      router.push(`/${locale}/properties/${id}`);
    },
  });

  if (isLoading) return <PageSpinner />;
  if (!property) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">
        {tc('edit')} — {locale === 'ar' ? property.name_ar : property.name}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{tc('edit')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('name')}</label>
                <Input {...register('name')} />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('name_ar')}</label>
                <Input {...register('name_ar')} dir="rtl" />
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
                <Input {...register('address')} />
                {errors.address && <p className="mt-1 text-xs text-destructive">{errors.address.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('address_ar')}</label>
                <Input {...register('address_ar')} dir="rtl" />
                {errors.address_ar && <p className="mt-1 text-xs text-destructive">{errors.address_ar.message}</p>}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-sheen-gold" />
                  {locale === 'ar' ? 'الموقع على الخريطة' : 'Location on map'}
                  <span className="text-xs font-normal text-muted-foreground">
                    {locale === 'ar' ? '(انقر على الخريطة لتحديد الموقع)' : '(click the map to drop a pin)'}
                  </span>
                </label>
                {location && (
                  <button
                    type="button"
                    onClick={() => setLocation(null)}
                    className="flex items-center gap-1 text-xs text-destructive hover:underline"
                  >
                    <Trash2 className="h-3 w-3" />
                    {locale === 'ar' ? 'إزالة الموقع' : 'Clear location'}
                  </button>
                )}
              </div>
              <LocationPicker value={location} onChange={setLocation} height={320} />
              {location && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {locale === 'ar' ? 'الإحداثيات:' : 'Coordinates:'}{' '}
                  <span className="font-mono">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
                </p>
              )}
            </div>

            {mutation.isError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {locale === 'ar' ? 'فشل الحفظ. حاول مرة أخرى.' : 'Failed to save. Please try again.'}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? '...' : tc('save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
