'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Wrench, FileText, Upload, Plus, ChevronRight } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { formatDate, formatCurrency } from '@aqari/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { CurrencyDisplay } from '@/components/shared/currency-display';
import { useAuthStore } from '@/stores/auth-store';

export function TenantDashboard({ locale }: { locale: string }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // Get tenant's payment schedules
  const { data: schedules } = useQuery({
    queryKey: ['tenant-schedules'],
    queryFn: async () => {
      const res = await apiClient.get('/payments/schedules', { params: { limit: 50 } });
      const data = res.data;
      return Array.isArray(data) ? data : (data?.data || []);
    },
  });

  // Get tenant's maintenance requests
  const { data: maintenance } = useQuery({
    queryKey: ['tenant-maintenance'],
    queryFn: async () => {
      const res = await apiClient.get('/maintenance', { params: { limit: 10 } });
      const data = res.data;
      return Array.isArray(data) ? data : (data?.data || []);
    },
  });

  // Get tenant's contracts
  const { data: contracts } = useQuery({
    queryKey: ['tenant-contracts'],
    queryFn: async () => {
      if (!user?.tenant_id) return [];
      const res = await apiClient.get(`/tenants/${user.tenant_id}/contracts`);
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
    enabled: !!user?.tenant_id,
  });

  const activeContract = contracts?.find((c: any) => c.status === 'active');
  const nextPayment = schedules
    ?.filter((s: any) => s.status === 'pending' || s.status === 'partial' || s.status === 'overdue')
    ?.sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())?.[0];

  const overdueCount = schedules?.filter((s: any) => s.status === 'overdue')?.length || 0;
  const paidCount = schedules?.filter((s: any) => s.status === 'paid')?.length || 0;
  const totalSchedules = schedules?.length || 0;

  const daysUntilExpiry = activeContract
    ? Math.ceil((new Date(activeContract.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div>
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-sheen-black">
          {locale === 'ar' ? 'مرحباً' : 'Welcome'}, {user?.name || user?.email}
        </h1>
        <p className="text-sm text-sheen-muted">
          {locale === 'ar' ? 'بوابة المستأجر' : 'Tenant Portal'}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card
          className="cursor-pointer border-sheen-gold/30 transition-all hover:border-sheen-gold hover:shadow-md"
          onClick={() => router.push(`/${locale}/payments/upload`)}
        >
          <CardContent className="flex flex-col items-center p-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sheen-gold/10">
              <Upload className="h-6 w-6 text-sheen-gold" />
            </div>
            <span className="text-sm font-semibold">{locale === 'ar' ? 'رفع إيصال' : 'Upload Receipt'}</span>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:border-sheen-brown/50 hover:shadow-md"
          onClick={() => router.push(`/${locale}/maintenance/new`)}
        >
          <CardContent className="flex flex-col items-center p-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sheen-brown/10">
              <Wrench className="h-6 w-6 text-sheen-brown" />
            </div>
            <span className="text-sm font-semibold">{locale === 'ar' ? 'طلب صيانة' : 'Request Maintenance'}</span>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:border-sheen-muted/50 hover:shadow-md"
          onClick={() => router.push(`/${locale}/contracts/${activeContract?.id || ''}`)}
        >
          <CardContent className="flex flex-col items-center p-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sheen-muted/10">
              <FileText className="h-6 w-6 text-sheen-muted" />
            </div>
            <span className="text-sm font-semibold">{locale === 'ar' ? 'عقدي' : 'My Contract'}</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Next Payment Due */}
        <Card className={nextPayment?.status === 'overdue' ? 'border-red-300' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                {locale === 'ar' ? 'الدفعة القادمة' : 'Next Payment'}
              </CardTitle>
              {nextPayment && <StatusBadge status={nextPayment.status} locale={locale} />}
            </div>
          </CardHeader>
          <CardContent>
            {nextPayment ? (
              <div>
                <div className="mb-4">
                  <p className="text-3xl font-bold text-sheen-black">
                    <CurrencyDisplay amount={Number(nextPayment.amount_due)} locale={locale as 'en' | 'ar'} />
                  </p>
                  <p className="text-sm text-sheen-muted">
                    {locale === 'ar' ? 'تاريخ الاستحقاق' : 'Due'}: {formatDate(nextPayment.due_date, locale as 'en' | 'ar')}
                  </p>
                </div>
                {Number(nextPayment.amount_paid) > 0 && (
                  <div className="mb-3 flex justify-between rounded-lg bg-sheen-cream p-3 text-sm">
                    <span className="text-sheen-muted">{locale === 'ar' ? 'المدفوع' : 'Paid'}</span>
                    <span className="font-medium text-green-600">
                      <CurrencyDisplay amount={Number(nextPayment.amount_paid)} locale={locale as 'en' | 'ar'} />
                    </span>
                  </div>
                )}
                <Button className="w-full" onClick={() => router.push(`/${locale}/payments/upload`)}>
                  <Upload className="me-2 h-4 w-4" />
                  {locale === 'ar' ? 'رفع إيصال الدفع' : 'Upload Payment Receipt'}
                </Button>
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-sheen-muted">
                {locale === 'ar' ? 'لا توجد دفعات مستحقة' : 'No pending payments'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Contract Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                {locale === 'ar' ? 'العقد' : 'Contract'}
              </CardTitle>
              {activeContract && <StatusBadge status={activeContract.status} locale={locale} />}
            </div>
          </CardHeader>
          <CardContent>
            {activeContract ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-sheen-muted">{locale === 'ar' ? 'الإيجار' : 'Rent'}</span>
                  <span className="font-semibold">
                    <CurrencyDisplay amount={Number(activeContract.rent_amount)} locale={locale as 'en' | 'ar'} />
                    <span className="text-xs text-sheen-muted"> /{locale === 'ar' ? 'شهري' : 'mo'}</span>
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-sheen-muted">{locale === 'ar' ? 'الوحدة' : 'Unit'}</span>
                  <span className="font-medium">{activeContract.unit?.unit_number || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-sheen-muted">{locale === 'ar' ? 'ينتهي' : 'Expires'}</span>
                  <span className="font-medium">{formatDate(activeContract.end_date, locale as 'en' | 'ar')}</span>
                </div>
                {daysUntilExpiry !== null && (
                  <div className={`rounded-lg p-3 text-center text-sm font-medium ${
                    daysUntilExpiry <= 30 ? 'bg-red-50 text-red-700' :
                    daysUntilExpiry <= 90 ? 'bg-yellow-50 text-yellow-700' :
                    'bg-green-50 text-green-700'
                  }`}>
                    {daysUntilExpiry > 0
                      ? `${daysUntilExpiry} ${locale === 'ar' ? 'يوم متبقي' : 'days remaining'}`
                      : locale === 'ar' ? 'منتهي' : 'Expired'}
                  </div>
                )}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-sheen-muted">
                {locale === 'ar' ? 'لا يوجد عقد نشط' : 'No active contract'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{locale === 'ar' ? 'ملخص المدفوعات' : 'Payment Summary'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/payments`)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{paidCount}</p>
                <p className="text-xs text-green-600">{locale === 'ar' ? 'مدفوع' : 'Paid'}</p>
              </div>
              <div className="rounded-lg bg-yellow-50 p-3 text-center">
                <p className="text-2xl font-bold text-yellow-700">{totalSchedules - paidCount - overdueCount}</p>
                <p className="text-xs text-yellow-600">{locale === 'ar' ? 'قيد الانتظار' : 'Pending'}</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <p className="text-2xl font-bold text-red-700">{overdueCount}</p>
                <p className="text-xs text-red-600">{locale === 'ar' ? 'متأخر' : 'Overdue'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Maintenance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="h-4 w-4" />
                {locale === 'ar' ? 'طلبات الصيانة' : 'Maintenance Requests'}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/maintenance`)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(!maintenance || maintenance.length === 0) ? (
              <div className="py-4 text-center">
                <p className="text-sm text-sheen-muted">{locale === 'ar' ? 'لا توجد طلبات صيانة' : 'No maintenance requests'}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push(`/${locale}/maintenance/new`)}>
                  <Plus className="me-2 h-3.5 w-3.5" />
                  {locale === 'ar' ? 'طلب جديد' : 'New Request'}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {maintenance.slice(0, 4).map((m: any) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm cursor-pointer hover:bg-sheen-cream/50"
                    onClick={() => router.push(`/${locale}/maintenance/${m.id}`)}
                  >
                    <div>
                      <p className="font-medium">{m.category?.name || m.description?.slice(0, 30)}</p>
                      <p className="text-xs text-sheen-muted">
                        {m.created_at ? formatDate(m.created_at, locale as 'en' | 'ar') : ''}
                      </p>
                    </div>
                    <StatusBadge status={m.status} locale={locale} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
