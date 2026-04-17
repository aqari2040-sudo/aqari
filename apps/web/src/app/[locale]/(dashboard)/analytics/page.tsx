'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  Brain, TrendingUp, TrendingDown, Minus, AlertTriangle,
  DollarSign, Wrench, Shield, Lightbulb, RefreshCw,
  Building2, Users, CreditCard, FileText,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/components/shared/currency-display';

const typeConfig = {
  financial: { icon: DollarSign, color: 'text-sheen-gold', bg: 'bg-sheen-gold/10', border: 'border-sheen-gold/20' },
  operational: { icon: Wrench, color: 'text-sheen-brown', bg: 'bg-sheen-brown/10', border: 'border-sheen-brown/20' },
  risk: { icon: Shield, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  recommendation: { icon: Lightbulb, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
};

const severityConfig = {
  info: { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  warning: { badge: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
  critical: { badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
};

const TrendIcon = ({ trend }: { trend?: string }) => {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
};

export default function AnalyticsPage({ params: { locale } }: { params: { locale: string } }) {
  const isAr = locale === 'ar';

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: async () => {
      const res = await apiClient.get('/analytics/insights');
      return res.data;
    },
  });

  const summary = data?.summary;
  const insights = data?.insights || [];

  const summaryCards = summary ? [
    { label: isAr ? 'العقارات' : 'Properties', value: summary.total_properties, icon: Building2 },
    { label: isAr ? 'الوحدات' : 'Units', value: `${summary.occupied}/${summary.total_units}`, icon: Building2, sub: `${summary.occupancy_rate?.toFixed(0)}%` },
    { label: isAr ? 'العقود النشطة' : 'Active Contracts', value: summary.active_contracts, icon: FileText },
    { label: isAr ? 'نسبة التحصيل' : 'Collection Rate', value: `${summary.collection_rate?.toFixed(1)}%`, icon: CreditCard },
    { label: isAr ? 'المتأخرات' : 'Total Overdue', value: summary.total_overdue, icon: DollarSign, isCurrency: true },
    { label: isAr ? 'تنتهي خلال 30 يوم' : 'Expiring (30d)', value: summary.expiring_30_days, icon: AlertTriangle },
    { label: isAr ? 'طلبات صيانة مفتوحة' : 'Open Maintenance', value: summary.maintenance_requests_open, icon: Wrench },
    { label: isAr ? 'بانتظار الموافقة' : 'Pending Approvals', value: summary.pending_approvals, icon: Shield },
  ] : [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sheen-gold to-sheen-brown">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-sheen-black">
              {isAr ? 'التحليلات الذكية' : 'AI Analytics'}
            </h1>
            <p className="text-sm text-sheen-muted">
              {isAr ? 'رؤى وتوصيات مدعومة بالذكاء الاصطناعي' : 'AI-powered insights & recommendations'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`me-2 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          {isAr ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <Brain className="h-8 w-8 animate-pulse text-sheen-gold" />
          <p className="text-sm text-sheen-muted">{isAr ? 'جاري تحليل البيانات...' : 'Analyzing your data...'}</p>
        </div>
      ) : (
        <>
          {/* Summary Grid */}
          <div className="mb-8 grid gap-3 grid-cols-2 md:grid-cols-4">
            {summaryCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-sheen-muted">{card.label}</p>
                      <Icon className="h-4 w-4 text-sheen-muted/50" />
                    </div>
                    <p className="mt-1 text-xl font-bold text-sheen-black">
                      {card.isCurrency
                        ? <CurrencyDisplay amount={Number(card.value)} locale={locale as 'en' | 'ar'} />
                        : card.value}
                    </p>
                    {card.sub && <p className="text-xs text-sheen-muted">{card.sub}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Insights */}
          <h2 className="mb-4 font-display text-lg font-semibold">
            {isAr ? 'الرؤى والتوصيات' : 'Insights & Recommendations'}
            <span className="ms-2 text-sm font-normal text-sheen-muted">({insights.length})</span>
          </h2>

          <div className="space-y-3">
            {insights.map((insight: any, i: number) => {
              const config = typeConfig[insight.type as keyof typeof typeConfig] || typeConfig.recommendation;
              const severity = severityConfig[insight.severity as keyof typeof severityConfig] || severityConfig.info;
              const Icon = config.icon;

              return (
                <Card key={i} className={`border ${config.border} transition-all hover:shadow-md`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.bg}`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="font-semibold text-sheen-black">
                            {isAr ? insight.title_ar : insight.title}
                          </h3>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${severity.badge}`}>
                            {insight.severity}
                          </span>
                          {insight.trend && <TrendIcon trend={insight.trend} />}
                        </div>
                        <p className="text-sm leading-relaxed text-sheen-muted">
                          {isAr ? insight.description_ar : insight.description}
                        </p>
                        {insight.metric != null && (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-sheen-cream px-3 py-1 text-sm font-semibold text-sheen-black">
                            {typeof insight.metric === 'number' && insight.metric > 100
                              ? <CurrencyDisplay amount={insight.metric} locale={locale as 'en' | 'ar'} />
                              : `${insight.metric}%`}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {insights.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Brain className="mb-3 h-8 w-8 text-sheen-muted/30" />
                <p className="text-sm text-sheen-muted">
                  {isAr ? 'لا توجد رؤى متاحة حالياً' : 'No insights available yet'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Generated timestamp */}
          {data?.generated_at && (
            <p className="mt-6 text-center text-xs text-sheen-muted">
              {isAr ? 'تم التحليل في' : 'Analysis generated at'}{' '}
              {new Date(data.generated_at).toLocaleString(isAr ? 'ar-AE' : 'en-AE')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
