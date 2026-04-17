'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, Upload, FileText } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { formatDate, formatCurrency } from '@aqari/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { CurrencyDisplay } from '@/components/shared/currency-display';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DataTable, type Column } from '@/components/shared/data-table';
import { PageSpinner } from '@/components/shared/spinner';
import { useAuthStore } from '@/stores/auth-store';

export default function ContractDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  const t = useTranslations('contracts');
  const tp = useTranslations('payments');
  const tc = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [terminateOpen, setTerminateOpen] = useState(false);

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: async () => {
      const res = await apiClient.get(`/contracts/${id}`);
      return res.data;
    },
  });

  const terminateMutation = useMutation({
    mutationFn: () => apiClient.delete(`/contracts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      router.push(`/${locale}/contracts`);
    },
  });

  const scheduleColumns: Column<any>[] = [
    {
      key: 'due_date',
      header: tc('date'),
      render: (item) => formatDate(item.due_date, locale as 'en' | 'ar'),
    },
    {
      key: 'amount_due',
      header: tp('amount_due'),
      render: (item) => <CurrencyDisplay amount={Number(item.amount_due)} locale={locale as 'en' | 'ar'} />,
    },
    {
      key: 'amount_paid',
      header: tp('amount_paid'),
      render: (item) => (
        <span className={Number(item.amount_paid) > 0 ? 'text-green-600 font-medium' : ''}>
          <CurrencyDisplay amount={Number(item.amount_paid)} locale={locale as 'en' | 'ar'} />
        </span>
      ),
    },
    {
      key: 'remaining',
      header: tp('remaining'),
      render: (item) => {
        const remaining = Number(item.amount_due) - Number(item.amount_paid);
        return remaining > 0 ? (
          <span className="text-red-600">
            <CurrencyDisplay amount={remaining} locale={locale as 'en' | 'ar'} />
          </span>
        ) : (
          <span className="text-green-600">—</span>
        );
      },
    },
    {
      key: 'status',
      header: tc('status'),
      render: (item) => <StatusBadge status={item.status} locale={locale} />,
    },
  ];

  if (isLoading) {
    return <PageSpinner />;
  }

  if (!contract) return null;

  const schedules = contract.payment_schedules || [];
  const totalDue = schedules.reduce((sum: number, s: any) => sum + Number(s.amount_due), 0);
  const totalPaid = schedules.reduce((sum: number, s: any) => sum + Number(s.amount_paid), 0);
  const overdueCount = schedules.filter((s: any) => s.status === 'overdue').length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/${locale}/contracts`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Contract</h1>
              <StatusBadge status={contract.status} locale={locale} />
            </div>
            <p className="text-sm text-muted-foreground">
              {locale === 'ar' ? contract.tenant?.full_name_ar : contract.tenant?.full_name}
              {' — '}{contract.unit?.unit_number}
            </p>
          </div>
        </div>
        {user?.role === 'owner' && contract.status === 'active' && (
          <Button variant="destructive" size="sm" onClick={() => setTerminateOpen(true)}>
            <Trash2 className="me-2 h-3.5 w-3.5" />
            Terminate
          </Button>
        )}
      </div>

      {/* Contract info cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('rent_amount')}</p>
            <p className="text-xl font-bold">
              <CurrencyDisplay amount={Number(contract.rent_amount)} locale={locale as 'en' | 'ar'} />
            </p>
            <p className="text-xs capitalize text-muted-foreground">{contract.payment_frequency}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Period</p>
            <p className="text-sm font-medium">
              {formatDate(contract.start_date, locale as 'en' | 'ar')} — {formatDate(contract.end_date, locale as 'en' | 'ar')}
            </p>
            <p className="text-xs text-muted-foreground">Grace: {contract.grace_period_days} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Collected</p>
            <p className="text-xl font-bold text-green-600">
              <CurrencyDisplay amount={totalPaid} locale={locale as 'en' | 'ar'} />
            </p>
            <p className="text-xs text-muted-foreground">
              of <CurrencyDisplay amount={totalDue} locale={locale as 'en' | 'ar'} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Overdue</p>
            <p className={`text-xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {overdueCount}
            </p>
            <p className="text-xs text-muted-foreground">periods</p>
          </CardContent>
        </Card>
      </div>

      {/* Document */}
      {contract.document_url && (
        <div className="mb-6">
          <a
            href={contract.document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent"
          >
            <FileText className="h-4 w-4" />
            View Contract Document
          </a>
        </div>
      )}

      {/* Payment schedules */}
      <h2 className="mb-4 text-lg font-semibold">Payment Schedule</h2>
      <DataTable
        columns={scheduleColumns}
        data={schedules}
        total={schedules.length}
      />

      <ConfirmDialog
        open={terminateOpen}
        title="Terminate Contract?"
        description="This will set the unit to vacant and cancel all remaining unpaid schedules. This action cannot be easily undone."
        confirmLabel="Terminate"
        loading={terminateMutation.isPending}
        onConfirm={() => terminateMutation.mutate()}
        onCancel={() => setTerminateOpen(false)}
      />
    </div>
  );
}
