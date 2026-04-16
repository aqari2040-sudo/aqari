'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createMaintenanceSchema, type CreateMaintenanceSchema } from '@aqari/shared';
import apiClient from '@/lib/api-client';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/shared/file-upload';

export default function NewMaintenancePage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('maintenance');
  const tc = useTranslations('common');
  const router = useRouter();
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [duplicateData, setDuplicateData] = useState<any>(null);

  const { data: units } = useQuery({
    queryKey: ['units-all'],
    queryFn: async () => {
      const res = await apiClient.get('/units', { params: { limit: 200 } });
      return res.data?.data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['maintenance-categories'],
    queryFn: async () => {
      const res = await apiClient.get('/maintenance/categories');
      return res.data || [];
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateMaintenanceSchema>({
    resolver: zodResolver(createMaintenanceSchema),
    defaultValues: { priority: 'medium' },
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateMaintenanceSchema) => {
      const res = await apiClient.post('/maintenance', {
        ...data,
        photos,
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data.duplicate_detected) {
        setDuplicateData(data);
      } else {
        router.push(`/${locale}/maintenance/${data.id}`);
      }
    },
    onError: (error: any) => {
      if (error?.response?.status === 409) {
        setDuplicateData(error.response.data);
      }
    },
  });

  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileName = `maintenance/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from('maintenance-photos')
        .upload(fileName, file);

      if (!error) {
        const { data } = supabase.storage.from('maintenance-photos').getPublicUrl(fileName);
        setPhotos((prev) => [...prev, data.publicUrl]);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">{t('add_request')}</h1>

      {/* Duplicate warning */}
      {duplicateData && (
        <Card className="mb-6 border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-yellow-800">
              {t('duplicate_warning')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-yellow-700">{duplicateData.message}</p>
            {duplicateData.existing_requests?.map((req: any) => (
              <div key={req.id} className="rounded-md border border-yellow-200 bg-white p-3">
                <p className="text-sm font-medium">
                  {locale === 'ar' ? req.category?.name_ar : req.category?.name} — {req.unit?.unit_number}
                </p>
                <p className="text-xs text-muted-foreground">{req.description}</p>
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(req.created_at).toLocaleDateString()} — Status: {req.status}
                </p>
              </div>
            ))}
            <p className="text-sm text-yellow-700">
              Only the property owner can override this check.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push(`/${locale}/maintenance/${duplicateData.request_id}`)}
              >
                View Blocked Request
              </Button>
              <Button variant="outline" onClick={() => router.push(`/${locale}/maintenance`)}>
                {tc('back')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!duplicateData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('add_request')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Unit</label>
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
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{t('category')}</label>
                  <select
                    {...register('category_id')}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">Select category...</option>
                    {(categories || []).map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {locale === 'ar' ? c.name_ar : c.name}
                      </option>
                    ))}
                  </select>
                  {errors.category_id && <p className="mt-1 text-xs text-destructive">{errors.category_id.message}</p>}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('priority')}</label>
                <select
                  {...register('priority')}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="low">{t('low')}</option>
                  <option value="medium">{t('medium')}</option>
                  <option value="high">{t('high')}</option>
                  <option value="urgent">{t('urgent')}</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">{tc('description')}</label>
                <textarea
                  {...register('description')}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  rows={4}
                  placeholder="Describe the issue..."
                />
                {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>}
              </div>

              {/* Photos */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">Photos</label>
                {photos.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {photos.map((url, i) => (
                      <div key={i} className="relative">
                        <img src={url} alt={`Photo ${i + 1}`} className="h-20 w-20 rounded-md object-cover" />
                        <button
                          type="button"
                          onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute -end-1 -top-1 rounded-full bg-destructive p-0.5 text-white"
                        >
                          <span className="block h-3 w-3 text-center text-[10px] leading-3">x</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {photos.length < 5 && (
                  <FileUpload
                    onFileSelect={handlePhotoUpload}
                    accept="image/jpeg,image/png,image/webp"
                    label={uploading ? 'Uploading...' : `Add photo (${photos.length}/5)`}
                  />
                )}
              </div>

              {mutation.isError && !(mutation.error as any)?.response?.data?.duplicate_detected && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {(mutation.error as any)?.response?.data?.message || 'Failed to create request.'}
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
      )}
    </div>
  );
}
