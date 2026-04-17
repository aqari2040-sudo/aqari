'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Scan, Brain, Check, Upload, Edit2 } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileUpload } from '@/components/shared/file-upload';

interface OcrResult {
  extracted_amount: number | null;
  extracted_date: string | null;
  confidence: number;
  flagged: boolean;
  raw_text: string;
}

export default function ScanReceiptPage({ params: { locale } }: { params: { locale: string } }) {
  const router = useRouter();
  const isAr = locale === 'ar';

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [scheduleId, setScheduleId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { data: schedules } = useQuery({
    queryKey: ['pending-schedules-scan'],
    queryFn: async () => {
      const res = await apiClient.get('/payments/schedules', { params: { limit: 100 } });
      const all = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      return all.filter((s: any) => s.status !== 'paid' && s.status !== 'cancelled');
    },
  });

  const handleFileSelect = async (f: File) => {
    setFile(f);
    setOcrResult(null);
    setError('');
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f));
    }

    // Auto upload to Supabase
    setUploading(true);
    try {
      const fileName = `${Date.now()}_${f.name}`;
      const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, f);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
      setImageUrl(urlData.publicUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleScan = async () => {
    if (!imageUrl) return;
    setScanning(true);
    setError('');
    try {
      // We need an endpoint that takes URL and returns OCR. The existing upload-receipt does OCR inline.
      // For now, we'll use a lightweight scan by directly hitting ocr. Since there's no separate endpoint,
      // we'll call upload-receipt with a temporary schedule then extract results.
      // Better: use the existing endpoint pattern. For true scan-before-upload, we'd need a /payments/scan endpoint.

      // For simplicity, we'll fake an OCR scan client-side by reading file base64 and calling Groq directly,
      // but that exposes the API key. Instead, we make a dedicated call.

      // Best approach: create a /payments/scan endpoint that only does OCR without creating a payment.
      // For now, show instructions.
      const res = await apiClient.post('/payments/scan', { image_url: imageUrl });
      setOcrResult(res.data);
      if (res.data.extracted_amount) setAmount(String(res.data.extracted_amount));
      if (res.data.extracted_date) setDate(res.data.extracted_date);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'AI scan failed. Please enter details manually.');
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async () => {
    if (!imageUrl || !scheduleId) {
      setError(isAr ? 'يرجى اختيار فترة الفاتورة' : 'Please select a billing period');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await apiClient.post('/payments/upload-receipt', {
        payment_schedule_id: scheduleId,
        receipt_file_url: imageUrl,
        payment_date: date || new Date().toISOString().split('T')[0],
        amount: amount ? Number(amount) : 0,
      });
      router.push(`/${locale}/payments/${res.data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const confidencePct = ocrResult ? Math.round(ocrResult.confidence * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sheen-gold to-sheen-brown">
          <Scan className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-sheen-black">
            {isAr ? 'مسح الإيصال بالذكاء الاصطناعي' : 'Scan Receipt with AI'}
          </h1>
          <p className="text-sm text-sheen-muted">
            {isAr ? 'ارفع الإيصال وسيقوم الذكاء الاصطناعي باستخراج البيانات' : 'Upload a receipt and AI will extract the data'}
          </p>
        </div>
      </div>

      {/* Upload */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">
            {isAr ? '١. رفع صورة الإيصال' : '1. Upload Receipt Image'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            onFileSelect={handleFileSelect}
            label={uploading ? (isAr ? 'جاري الرفع...' : 'Uploading...') : isAr ? 'اختر صورة إيصال التحويل' : 'Select bank transfer receipt'}
            preview={preview}
          />
          {imageUrl && (
            <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              ✓ {isAr ? 'تم الرفع بنجاح' : 'Uploaded successfully'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan button */}
      {imageUrl && !ocrResult && (
        <Card className="mb-4 border-sheen-gold/30">
          <CardContent className="flex flex-col items-center py-8">
            <Button
              size="lg"
              onClick={handleScan}
              disabled={scanning}
              className="gap-2"
            >
              {scanning ? (
                <>
                  <Brain className="h-5 w-5 animate-pulse" />
                  {isAr ? 'جاري التحليل...' : 'Analyzing...'}
                </>
              ) : (
                <>
                  <Brain className="h-5 w-5" />
                  {isAr ? 'مسح بالذكاء الاصطناعي' : 'Scan with AI'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* OCR Results */}
      {ocrResult && (
        <Card className="mb-4 border-sheen-gold/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                {isAr ? '٢. البيانات المستخرجة' : '2. Extracted Data'}
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant="secondary">AI Extracted</Badge>
                <Badge variant={confidencePct >= 85 ? 'success' : confidencePct >= 70 ? 'warning' : 'destructive'}>
                  {confidencePct}% {isAr ? 'ثقة' : 'confidence'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {isAr ? 'فترة الفوترة' : 'Billing Period'}
              </label>
              <select
                value={scheduleId}
                onChange={(e) => setScheduleId(e.target.value)}
                className="h-10 w-full rounded-lg border border-sheen-muted/30 bg-white px-3 text-sm"
                required
              >
                <option value="">{isAr ? 'اختر فترة...' : 'Select billing period...'}</option>
                {(schedules || []).map((s: any) => {
                  const dueDate = new Date(s.due_date).toLocaleDateString(isAr ? 'ar-AE' : 'en-AE');
                  const remaining = Number(s.amount_due) - Number(s.amount_paid);
                  const unitNumber = s.contract?.unit?.unit_number || '';
                  const tenantName = s.contract?.tenant?.full_name || '';
                  return (
                    <option key={s.id} value={s.id}>
                      {unitNumber} — {tenantName} — {dueDate} — AED {remaining.toFixed(2)}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {isAr ? 'المبلغ (د.إ)' : 'Amount (AED)'}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {isAr ? 'تاريخ الدفع' : 'Payment Date'}
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {ocrResult.raw_text && (
              <div className="rounded-lg bg-sheen-cream p-3 text-xs text-sheen-muted">
                <span className="font-medium">{isAr ? 'تفاصيل AI' : 'AI Details'}: </span>
                {ocrResult.raw_text}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Submit */}
      {ocrResult && (
        <Button
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={submitting || !scheduleId}
        >
          {submitting
            ? isAr ? 'جاري الإرسال...' : 'Submitting...'
            : isAr ? 'تأكيد الدفعة' : 'Confirm Payment'}
        </Button>
      )}

      {/* Skip AI option */}
      {imageUrl && (
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push(`/${locale}/payments/upload`)}
            className="text-sm text-sheen-muted underline hover:text-sheen-black"
          >
            {isAr ? 'تخطي الذكاء الاصطناعي وإدخال البيانات يدوياً' : 'Skip AI and enter details manually'}
          </button>
        </div>
      )}
    </div>
  );
}
