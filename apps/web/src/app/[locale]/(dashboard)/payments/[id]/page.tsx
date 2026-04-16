'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, X, AlertTriangle, ZoomIn } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { formatDate } from '@aqari/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { CurrencyDisplay } from '@/components/shared/currency-display';

export default function PaymentDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  const t = useTranslations('payments');
  const tc = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();

  const [confirmAmount, setConfirmAmount] = useState('');
  const [confirmDate, setConfirmDate] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [imageZoom, setImageZoom] = useState(false);

  const { data: payment, isLoading } = useQuery({
    queryKey: ['payment', id],
    queryFn: async () => {
      const res = await apiClient.get(`/payments/${id}`);
      const data = res.data;
      if (data.ocr_extracted_amount) setConfirmAmount(String(data.ocr_extracted_amount));
      if (data.ocr_extracted_date) setConfirmDate(data.ocr_extracted_date.split('T')[0]);
      else if (data.payment_date) setConfirmDate(data.payment_date.split('T')[0]);
      return data;
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () =>
      apiClient.patch(`/payments/${id}/confirm`, {
        confirmed_amount: Number(confirmAmount),
        confirmed_date: confirmDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment', id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      apiClient.patch(`/payments/${id}/reject`, {
        rejection_reason: rejectReason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment', id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">{tc('loading')}</div>;
  }

  if (!payment) return null;

  const isPending = payment.status === 'pending_review';
  const confidence = payment.ocr_confidence ? Math.round(Number(payment.ocr_confidence) * 100) : null;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/${locale}/payments`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Payment Review</h1>
            <StatusBadge status={payment.status} locale={locale} />
          </div>
          <p className="text-sm text-muted-foreground">
            {locale === 'ar' ? payment.tenant?.full_name_ar : payment.tenant?.full_name}
            {' — '}{payment.unit?.unit_number}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Receipt image */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              {t('receipt_image')}
              <Button variant="ghost" size="sm" onClick={() => setImageZoom(!imageZoom)}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payment.receipt_file_url ? (
              <div className={`overflow-auto ${imageZoom ? 'max-h-[80vh]' : 'max-h-96'}`}>
                <img
                  src={payment.receipt_file_url}
                  alt="Receipt"
                  className={`rounded-md ${imageZoom ? 'w-full' : 'max-h-96 object-contain'}`}
                />
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">No receipt image</p>
            )}
          </CardContent>
        </Card>

        {/* OCR results + confirm/reject */}
        <div className="space-y-4">
          {/* OCR extracted data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">OCR Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confidence</span>
                {confidence !== null ? (
                  <Badge variant={payment.ocr_flagged ? 'warning' : confidence >= 85 ? 'success' : 'secondary'}>
                    {confidence}%
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">N/A</span>
                )}
              </div>

              {payment.ocr_flagged && (
                <div className="flex items-center gap-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {t('ocr_low_confidence')}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Detected Amount</span>
                <span className="font-medium">
                  {payment.ocr_extracted_amount
                    ? <CurrencyDisplay amount={Number(payment.ocr_extracted_amount)} locale={locale as 'en' | 'ar'} />
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Detected Date</span>
                <span className="font-medium">
                  {payment.ocr_extracted_date
                    ? formatDate(payment.ocr_extracted_date, locale as 'en' | 'ar')
                    : '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Confirm / Reject actions */}
          {isPending && !showReject && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('confirm_payment')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{tc('amount')} (AED)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={confirmAmount}
                    onChange={(e) => setConfirmAmount(e.target.value)}
                    placeholder="Confirmed amount"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{tc('date')}</label>
                  <Input
                    type="date"
                    value={confirmDate}
                    onChange={(e) => setConfirmDate(e.target.value)}
                  />
                </div>

                {confirmMutation.isError && (
                  <p className="text-sm text-destructive">Failed to confirm. Please try again.</p>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => confirmMutation.mutate()}
                    disabled={confirmMutation.isPending || !confirmAmount || !confirmDate}
                    className="flex-1"
                  >
                    <Check className="me-2 h-4 w-4" />
                    {confirmMutation.isPending ? '...' : tc('confirm')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowReject(true)}
                    className="flex-1"
                  >
                    <X className="me-2 h-4 w-4" />
                    {tc('reject')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isPending && showReject && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('reject_payment')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{t('rejection_reason')}</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    rows={3}
                    required
                  />
                </div>

                {rejectMutation.isError && (
                  <p className="text-sm text-destructive">Failed to reject. Please try again.</p>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    onClick={() => rejectMutation.mutate()}
                    disabled={rejectMutation.isPending || !rejectReason}
                    className="flex-1"
                  >
                    {rejectMutation.isPending ? '...' : t('reject_payment')}
                  </Button>
                  <Button variant="outline" onClick={() => setShowReject(false)} className="flex-1">
                    {tc('back')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Already confirmed/rejected info */}
          {payment.status === 'confirmed' && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-green-600 font-medium">Payment Confirmed</p>
                <p className="text-sm text-muted-foreground">
                  Amount: <CurrencyDisplay amount={Number(payment.amount)} locale={locale as 'en' | 'ar'} />
                </p>
                <p className="text-sm text-muted-foreground">
                  Confirmed at: {payment.confirmed_at ? formatDate(payment.confirmed_at, locale as 'en' | 'ar') : '—'}
                </p>
              </CardContent>
            </Card>
          )}

          {payment.status === 'rejected' && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-red-600 font-medium">Payment Rejected</p>
                <p className="text-sm text-muted-foreground">
                  Reason: {payment.rejection_reason || '—'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
