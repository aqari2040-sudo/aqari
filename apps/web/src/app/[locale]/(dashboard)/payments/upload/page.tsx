'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/shared/file-upload';

export default function UploadReceiptPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('payments');
  const tc = useTranslations('common');
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scheduleId, setScheduleId] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [amount, setAmount] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Fetch pending/partial schedules
  const { data: schedules } = useQuery({
    queryKey: ['pending-schedules'],
    queryFn: async () => {
      // Fetch all non-paid schedules
      const res = await apiClient.get('/payments/schedules', { params: { limit: 100 } });
      const all = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      // Filter out paid and cancelled on the client side
      return all.filter((s: any) => s.status !== 'paid' && s.status !== 'cancelled');
    },
  });

  const handleFileSelect = (f: File) => {
    setFile(f);
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(f.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !scheduleId) {
      setError('Please select a file and billing period.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // 1. Upload file to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) {
        setError('Failed to upload file: ' + uploadError.message);
        setUploading(false);
        return;
      }

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      // 3. Submit to backend
      const res = await apiClient.post('/payments/upload-receipt', {
        payment_schedule_id: scheduleId,
        receipt_file_url: urlData.publicUrl,
        payment_date: paymentDate || new Date().toISOString().split('T')[0],
        amount: amount ? Number(amount) : 0,
      });

      router.push(`/${locale}/payments/${res.data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit receipt.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">{t('upload_receipt')}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('receipt_image')}</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFileSelect={handleFileSelect}
              label="Upload bank transfer receipt"
              preview={preview}
            />
          </CardContent>
        </Card>

        {/* Payment details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t('billing_period')}</label>
              <select
                value={scheduleId}
                onChange={(e) => setScheduleId(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                required
              >
                <option value="">Select billing period...</option>
                {(schedules || []).map((s: any) => {
                  const dueDate = new Date(s.due_date).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE');
                  const remaining = Number(s.amount_due) - Number(s.amount_paid);
                  const tenantName = s.contract?.tenant?.full_name || '';
                  const unitNumber = s.contract?.unit?.unit_number || '';
                  return (
                    <option key={s.id} value={s.id}>
                      {unitNumber} — {tenantName} — Due: {dueDate} — Remaining: AED {remaining.toFixed(2)}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">{tc('amount')} (AED)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount on receipt"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Leave blank to use OCR-detected amount
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{tc('date')}</label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Date shown on the transfer slip
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            {tc('cancel')}
          </Button>
          <Button type="submit" disabled={uploading || !file}>
            {uploading ? 'Uploading...' : t('upload_receipt')}
          </Button>
        </div>
      </form>
    </div>
  );
}
