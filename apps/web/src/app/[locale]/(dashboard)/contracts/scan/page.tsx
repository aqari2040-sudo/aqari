'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Brain, Scan, FileText, Check, Upload, Pencil, AlertCircle } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { supabase } from '@/lib/supabase';
import { FileUpload } from '@/components/shared/file-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScanResult {
  extracted: {
    tenant_name?: string;
    tenant_name_ar?: string;
    unit_number?: string;
    start_date?: string;
    end_date?: string;
    rent_amount?: number;
    payment_frequency?: string;
    grace_period_days?: number;
  };
  confidence: number;
  raw_text: string;
}

interface EditableFields {
  tenant_name: string;
  tenant_name_ar: string;
  unit_number: string;
  start_date: string;
  end_date: string;
  rent_amount: string;
  payment_frequency: string;
  grace_period_days: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
  if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

function confidenceLabel(confidence: number, locale: string): string {
  const pct = Math.round(confidence * 100);
  if (locale === 'ar') return `${pct}% دقة`;
  return `${pct}% confidence`;
}

// ─── Field Row Component ──────────────────────────────────────────────────────

function FieldRow({
  label,
  fieldKey,
  value,
  type = 'text',
  options,
  onChange,
}: {
  label: string;
  fieldKey: keyof EditableFields;
  value: string;
  type?: string;
  options?: { value: string; label: string }[];
  onChange: (key: keyof EditableFields, val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const hasValue = value !== '' && value !== undefined;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/30">
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-xs font-medium text-muted-foreground">{label}</p>
        {editing ? (
          options ? (
            <select
              autoFocus
              value={value}
              onChange={(e) => onChange(fieldKey, e.target.value)}
              onBlur={() => setEditing(false)}
              className="h-8 w-full rounded border bg-background px-2 text-sm"
            >
              <option value="">—</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <Input
              autoFocus
              type={type}
              value={value}
              onChange={(e) => onChange(fieldKey, e.target.value)}
              onBlur={() => setEditing(false)}
              className="h-8 text-sm"
            />
          )
        ) : (
          <p className={`text-sm font-medium ${hasValue ? 'text-foreground' : 'italic text-muted-foreground'}`}>
            {hasValue ? value : '—'}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => setEditing((v) => !v)}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent/20 hover:text-accent-foreground"
        aria-label="Edit field"
      >
        {editing ? <Check className="h-4 w-4 text-green-600" /> : <Pencil className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContractScanPage({ params: { locale } }: { params: { locale: string } }) {
  const router = useRouter();
  // Translation keys — fall back to English inline labels if namespace not set up
  let t: (key: string) => string;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    t = useTranslations('contracts');
  } catch {
    t = (key: string) => key;
  }

  const isAr = locale === 'ar';

  // ── State ────────────────────────────────────────────────────────────────
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const [fields, setFields] = useState<EditableFields>({
    tenant_name: '',
    tenant_name_ar: '',
    unit_number: '',
    start_date: '',
    end_date: '',
    rent_amount: '',
    payment_frequency: '',
    grace_period_days: '',
  });

  // ── Upload to Supabase Storage ────────────────────────────────────────────
  const handleFileSelect = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError('');
    setScanResult(null);
    setScanError('');

    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `scans/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage.from('contracts').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) throw new Error(error.message);

      const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      setImageUrl(publicUrl);
      // For PDF preview, show generic icon; for images show URL directly
      setPreviewUrl(file.type === 'application/pdf' ? publicUrl + '.pdf' : publicUrl);
    } catch (err: any) {
      setUploadError(err.message || (isAr ? 'فشل رفع الملف' : 'File upload failed'));
    } finally {
      setUploading(false);
    }
  }, [isAr]);

  // ── AI Scan ───────────────────────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    if (!imageUrl) return;
    setScanning(true);
    setScanError('');
    setScanResult(null);

    try {
      const res = await apiClient.post('/contracts/scan', { image_url: imageUrl, lang: locale });
      const result: ScanResult = res.data;
      setScanResult(result);

      // Pre-fill editable fields with extracted values
      setFields({
        tenant_name: result.extracted.tenant_name ?? '',
        tenant_name_ar: result.extracted.tenant_name_ar ?? '',
        unit_number: result.extracted.unit_number ?? '',
        start_date: result.extracted.start_date ?? '',
        end_date: result.extracted.end_date ?? '',
        rent_amount: result.extracted.rent_amount != null ? String(result.extracted.rent_amount) : '',
        payment_frequency: result.extracted.payment_frequency ?? '',
        grace_period_days: result.extracted.grace_period_days != null ? String(result.extracted.grace_period_days) : '',
      });
    } catch (err: any) {
      setScanError(err?.response?.data?.message || err.message || (isAr ? 'فشل تحليل العقد' : 'Contract scan failed'));
    } finally {
      setScanning(false);
    }
  }, [imageUrl, locale, isAr]);

  // ── Field change handler ──────────────────────────────────────────────────
  const handleFieldChange = useCallback((key: keyof EditableFields, val: string) => {
    setFields((prev) => ({ ...prev, [key]: val }));
  }, []);

  // ── Navigate to /contracts/new with pre-filled params ────────────────────
  const handleCreateContract = useCallback(() => {
    const params = new URLSearchParams();
    if (fields.tenant_name) params.set('tenant_name', fields.tenant_name);
    if (fields.tenant_name_ar) params.set('tenant_name_ar', fields.tenant_name_ar);
    if (fields.unit_number) params.set('unit_number', fields.unit_number);
    if (fields.start_date) params.set('start_date', fields.start_date);
    if (fields.end_date) params.set('end_date', fields.end_date);
    if (fields.rent_amount) params.set('rent_amount', fields.rent_amount);
    if (fields.payment_frequency) params.set('payment_frequency', fields.payment_frequency);
    if (fields.grace_period_days) params.set('grace_period_days', fields.grace_period_days);
    if (imageUrl) params.set('document_url', imageUrl);

    router.push(`/${locale}/contracts/new?${params.toString()}`);
  }, [fields, imageUrl, locale, router]);

  // ── Labels (bilingual inline) ────────────────────────────────────────────
  const labels = {
    pageTitle: isAr ? 'مسح العقد بالذكاء الاصطناعي' : 'AI Contract Scanner',
    pageSubtitle: isAr
      ? 'ارفع صورة أو ملف PDF للعقد وسيستخرج الذكاء الاصطناعي البيانات تلقائياً'
      : 'Upload a contract image or PDF and AI will extract the data automatically',
    uploadLabel: isAr ? 'رفع العقد' : 'Upload Contract',
    scanBtn: isAr ? 'تحليل بالذكاء الاصطناعي' : 'Scan with AI',
    analyzing: isAr ? 'جاري التحليل...' : 'Analyzing contract...',
    resultsTitle: isAr ? 'البيانات المستخرجة' : 'AI Extracted Data',
    aiBadge: isAr ? 'مستخرج بالذكاء الاصطناعي' : 'AI Extracted',
    createBtn: isAr ? 'إنشاء عقد' : 'Create Contract',
    tenantName: isAr ? 'اسم المستأجر (إنجليزي)' : 'Tenant Name (English)',
    tenantNameAr: isAr ? 'اسم المستأجر (عربي)' : 'Tenant Name (Arabic)',
    unitNumber: isAr ? 'رقم الوحدة' : 'Unit Number',
    startDate: isAr ? 'تاريخ البداية' : 'Start Date',
    endDate: isAr ? 'تاريخ النهاية' : 'End Date',
    rentAmount: isAr ? 'قيمة الإيجار (درهم)' : 'Rent Amount (AED)',
    frequency: isAr ? 'دورية الدفع' : 'Payment Frequency',
    gracePeriod: isAr ? 'فترة السماح (أيام)' : 'Grace Period (Days)',
    monthly: isAr ? 'شهري' : 'Monthly',
    quarterly: isAr ? 'ربع سنوي' : 'Quarterly',
    yearly: isAr ? 'سنوي' : 'Yearly',
    uploadFirst: isAr ? 'يرجى رفع صورة العقد أولاً' : 'Please upload a contract image first',
  };

  const frequencyOptions = [
    { value: 'monthly', label: labels.monthly },
    { value: 'quarterly', label: labels.quarterly },
    { value: 'yearly', label: labels.yearly },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`mx-auto max-w-3xl space-y-6 ${isAr ? 'text-right' : ''}`} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4A843]/20">
          <Scan className="h-5 w-5 text-[#D4A843]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{labels.pageTitle}</h1>
          <p className="text-sm text-muted-foreground">{labels.pageSubtitle}</p>
        </div>
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4 text-[#D4A843]" />
            {labels.uploadLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload
            onFileSelect={handleFileSelect}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            maxSizeMb={10}
            label={labels.uploadLabel}
            preview={previewUrl || null}
          />

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#D4A843] border-t-transparent" />
              {isAr ? 'جاري الرفع...' : 'Uploading...'}
            </div>
          )}

          {uploadError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {uploadError}
            </div>
          )}

          {imageUrl && !uploading && (
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-2.5">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Check className="h-4 w-4" />
                {isAr ? 'تم رفع الملف بنجاح' : 'File uploaded successfully'}
              </div>
              <Button
                onClick={handleScan}
                disabled={scanning}
                className="h-8 gap-1.5 bg-[#D4A843] px-4 text-sm font-semibold text-white hover:bg-[#C09030]"
              >
                <Brain className="h-4 w-4" />
                {scanning ? labels.analyzing : labels.scanBtn}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scanning state */}
      {scanning && (
        <Card className="border-[#D4A843]/30">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-[#D4A843]/20" />
              <Brain className="relative h-8 w-8 text-[#D4A843]" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{labels.analyzing}</p>
          </CardContent>
        </Card>
      )}

      {/* Scan error */}
      {scanError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {scanError}
        </div>
      )}

      {/* Results Card */}
      {scanResult && !scanning && (
        <Card className="border-2 border-[#D4A843]/40">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-[#D4A843]" />
                {labels.resultsTitle}
              </CardTitle>

              <div className="flex items-center gap-2">
                {/* AI Extracted badge */}
                <span className="inline-flex items-center gap-1 rounded-full border border-[#D4A843]/40 bg-[#D4A843]/10 px-3 py-1 text-xs font-semibold text-[#8B4513]">
                  <Brain className="h-3 w-3" />
                  {labels.aiBadge}
                </span>

                {/* Confidence badge */}
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${confidenceColor(scanResult.confidence)}`}
                >
                  {confidenceLabel(scanResult.confidence, locale)}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Fields grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldRow
                label={labels.tenantName}
                fieldKey="tenant_name"
                value={fields.tenant_name}
                onChange={handleFieldChange}
              />
              <FieldRow
                label={labels.tenantNameAr}
                fieldKey="tenant_name_ar"
                value={fields.tenant_name_ar}
                onChange={handleFieldChange}
              />
              <FieldRow
                label={labels.unitNumber}
                fieldKey="unit_number"
                value={fields.unit_number}
                onChange={handleFieldChange}
              />
              <FieldRow
                label={labels.frequency}
                fieldKey="payment_frequency"
                value={fields.payment_frequency}
                options={frequencyOptions}
                onChange={handleFieldChange}
              />
              <FieldRow
                label={labels.startDate}
                fieldKey="start_date"
                value={fields.start_date}
                type="date"
                onChange={handleFieldChange}
              />
              <FieldRow
                label={labels.endDate}
                fieldKey="end_date"
                value={fields.end_date}
                type="date"
                onChange={handleFieldChange}
              />
              <FieldRow
                label={labels.rentAmount}
                fieldKey="rent_amount"
                value={fields.rent_amount}
                type="number"
                onChange={handleFieldChange}
              />
              <FieldRow
                label={labels.gracePeriod}
                fieldKey="grace_period_days"
                value={fields.grace_period_days}
                type="number"
                onChange={handleFieldChange}
              />
            </div>

            {/* Divider */}
            <div className="pt-2">
              <div className="h-px bg-border" />
            </div>

            {/* Action button */}
            <div className="flex justify-end pt-1">
              <Button
                onClick={handleCreateContract}
                className="gap-2 bg-[#8B4513] px-6 font-semibold text-white hover:bg-[#7A3B10]"
              >
                <Check className="h-4 w-4" />
                {labels.createBtn}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state — no image yet, no scanning */}
      {!imageUrl && !scanning && !scanResult && (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-[#D4A843]/30 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D4A843]/10">
            <Brain className="h-7 w-7 text-[#D4A843]" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{labels.uploadFirst}</p>
        </div>
      )}
    </div>
  );
}
