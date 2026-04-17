'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, CreditCard, Wrench, AlertTriangle,
  FileText, TrendingUp, ArrowRight,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip,
} from 'recharts';
import apiClient from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { CurrencyDisplay } from '@/components/shared/currency-display';
import { useAuthStore } from '@/stores/auth-store';

const PIE_COLORS = ['#22c55e', '#eab308', '#ef4444'];

export default function DashboardPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const { data: occupancy } = useQuery({
    queryKey: ['dashboard-occupancy'],
    queryFn: async () => (await apiClient.get('/dashboard/occupancy')).data,
  });

  const { data: payments } = useQuery({
    queryKey: ['dashboard-payments'],
    queryFn: async () => (await apiClient.get('/dashboard/payments-summary')).data,
  });

  const { data: maintenance } = useQuery({
    queryKey: ['dashboard-maintenance'],
    queryFn: async () => (await apiClient.get('/dashboard/maintenance-summary')).data,
  });

  const { data: alerts } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: async () => (await apiClient.get('/dashboard/alerts')).data,
    enabled: user?.role === 'owner',
  });

  const occupancyPieData = occupancy
    ? [
        { name: t('occupied'), value: occupancy.occupied, color: PIE_COLORS[0] },
        { name: t('vacant'), value: occupancy.vacant, color: PIE_COLORS[1] },
        { name: t('under_maintenance'), value: occupancy.under_maintenance, color: PIE_COLORS[2] },
      ]
    : [];

  const categoryBarData = (maintenance?.by_category || []).map((c: any) => ({
    name: c.category_name,
    cost: Number(c.total_cost),
    count: c.request_count,
  }));

  const totalAlerts = alerts
    ? (alerts.expiring_contracts?.length || 0) +
      (alerts.suspicious_costs?.length || 0) +
      (alerts.recurring_maintenance?.length || 0) +
      (alerts.budget_warnings?.length || 0)
    : 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t('title')}</h1>

      {/* Top summary cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Occupancy */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('occupancy')}</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{occupancy?.occupancy_rate?.toFixed(0) || '—'}%</div>
            <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
              <span className="text-green-600">{occupancy?.occupied || 0} {t('occupied')}</span>
              <span className="text-yellow-600">{occupancy?.vacant || 0} {t('vacant')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('payments_summary')}</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {payments?.collection_rate?.toFixed(0) || '—'}%
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              <CurrencyDisplay amount={payments?.total_collected || 0} locale={locale as 'en' | 'ar'} />
              {' / '}
              <CurrencyDisplay amount={payments?.total_due || 0} locale={locale as 'en' | 'ar'} />
            </div>
            {(payments?.total_overdue || 0) > 0 && (
              <div className="mt-1 text-xs text-red-600">
                {t('overdue')}: <CurrencyDisplay amount={payments.total_overdue} locale={locale as 'en' | 'ar'} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Maintenance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('maintenance_summary')}</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{maintenance?.pending_approvals || 0}</div>
            <p className="text-xs text-muted-foreground">{t('pending_approvals')}</p>
            <div className="mt-1 text-xs text-muted-foreground">
              {t('total_cost')}: <CurrencyDisplay amount={maintenance?.total_cost_this_month || 0} locale={locale as 'en' | 'ar'} />
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className={totalAlerts > 0 ? 'border-yellow-300' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('alerts')}</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${totalAlerts > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${totalAlerts > 0 ? 'text-yellow-600' : ''}`}>
              {totalAlerts}
            </div>
            <p className="text-xs text-muted-foreground">{t('active_alerts')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {/* Occupancy pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('occupancy')}</CardTitle>
          </CardHeader>
          <CardContent>
            {occupancyPieData.length > 0 && occupancy?.total_units > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={occupancyPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {occupancyPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {occupancyPieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span>{entry.name}: <strong>{entry.value}</strong></span>
                    </div>
                  ))}
                  <div className="pt-1 text-xs text-muted-foreground">
                    {t('total_units', { count: occupancy?.total_units || 0 })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No unit data</p>
            )}
          </CardContent>
        </Card>

        {/* Maintenance cost by category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('maintenance_by_category')}</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryBarData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [`AED ${value.toLocaleString()}`, 'Cost']}
                  />
                  <Bar dataKey="cost" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('no_maintenance_data')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Payment progress + Alerts detail */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Payment collection progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t('payments_summary')}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/payments`)}>
              {t('overdue')} <ArrowRight className="ms-1 h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {/* Progress bar */}
            <div className="mb-3">
              <div className="mb-1 flex justify-between text-sm">
                <span>{t('collected')}</span>
                <span className="font-medium">{payments?.collection_rate?.toFixed(1) || 0}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${payments?.collection_rate || 0}%` }}
                />
              </div>
            </div>
            {/* Overdue list */}
            {(payments?.overdue_tenants || []).length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-red-600">{t('overdue')}</h4>
                {payments.overdue_tenants.slice(0, 5).map((ot: any) => (
                  <div key={ot.tenant_id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <div>
                      <span className="font-medium">{ot.tenant_name}</span>
                      <span className="ms-2 text-muted-foreground">{ot.unit_number}</span>
                    </div>
                    <div className="text-end">
                      <CurrencyDisplay amount={ot.amount_overdue} locale={locale as 'en' | 'ar'} className="font-medium text-red-600" />
                      <span className="ms-2 text-xs text-muted-foreground">{ot.days_overdue}d</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts detail */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t('alerts')}</CardTitle>
          </CardHeader>
          <CardContent>
            {totalAlerts === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{t('no_active_alerts')}</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {/* Expiring contracts */}
                {(alerts?.expiring_contracts || []).map((c: any) => (
                  <div
                    key={c.contract_id}
                    className="flex items-center justify-between rounded-md border p-2 text-sm cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/${locale}/contracts/${c.contract_id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-yellow-600" />
                      <span>{c.tenant_name} — {c.unit_number}</span>
                    </div>
                    <Badge variant="warning">{c.days_remaining}d left</Badge>
                  </div>
                ))}
                {/* Suspicious costs */}
                {(alerts?.suspicious_costs || []).map((c: any) => (
                  <div key={c.cost_id} className="flex items-center justify-between rounded-md border border-red-200 p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                      <span>{c.unit_number}</span>
                    </div>
                    <div className="text-end text-xs">
                      <span className="text-red-600 font-medium">
                        <CurrencyDisplay amount={c.amount} locale={locale as 'en' | 'ar'} />
                      </span>
                      <span className="ms-1 text-muted-foreground">
                        (avg: <CurrencyDisplay amount={c.unit_average} locale={locale as 'en' | 'ar'} />)
                      </span>
                    </div>
                  </div>
                ))}
                {/* Recurring maintenance */}
                {(alerts?.recurring_maintenance || []).map((r: any) => (
                  <div
                    key={r.unit_id}
                    className="flex items-center justify-between rounded-md border p-2 text-sm cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/${locale}/units/${r.unit_id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <Wrench className="h-3.5 w-3.5 text-orange-600" />
                      <span>{r.unit_number}</span>
                    </div>
                    <Badge variant="destructive">{r.request_count} requests</Badge>
                  </div>
                ))}
                {/* Budget warnings */}
                {(alerts?.budget_warnings || []).map((b: any) => (
                  <div key={b.unit_id} className="flex items-center justify-between rounded-md border border-yellow-200 p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5 text-yellow-600" />
                      <span>{b.unit_number}</span>
                    </div>
                    <span className="text-xs text-yellow-600 font-medium">{b.percentage.toFixed(0)}% budget used</span>
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
