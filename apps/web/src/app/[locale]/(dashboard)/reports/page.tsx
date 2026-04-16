'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { FileDown, FileSpreadsheet, FileText, Building2, CreditCard, Wrench } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ReportType = 'occupancy' | 'payments' | 'maintenance';
type Format = 'pdf' | 'excel';

const reportConfigs: Record<ReportType, { icon: any; title: string; title_ar: string; description: string }> = {
  occupancy: {
    icon: Building2,
    title: 'Occupancy Report',
    title_ar: 'تقرير الإشغال',
    description: 'Unit occupancy status across all properties with tenant details.',
  },
  payments: {
    icon: CreditCard,
    title: 'Payments Report',
    title_ar: 'تقرير المدفوعات',
    description: 'Payment schedules, collected amounts, and overdue balances.',
  },
  maintenance: {
    icon: Wrench,
    title: 'Maintenance Report',
    title_ar: 'تقرير الصيانة',
    description: 'Maintenance requests, costs by category, and approval status.',
  },
};

export default function ReportsPage({ params: { locale } }: { params: { locale: string } }) {
  const tc = useTranslations('common');
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [format, setFormat] = useState<Format>('excel');
  const [lang, setLang] = useState<'en' | 'ar'>(locale as 'en' | 'ar');
  const [propertyId, setPropertyId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [downloading, setDownloading] = useState(false);

  const { data: properties } = useQuery({
    queryKey: ['properties-list'],
    queryFn: async () => {
      const res = await apiClient.get('/properties', { params: { limit: 100 } });
      return res.data?.data || [];
    },
  });

  const handleDownload = async () => {
    if (!selectedReport) return;
    setDownloading(true);

    try {
      const params: Record<string, any> = { format, lang };
      if (propertyId) params.property_id = propertyId;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;

      const res = await apiClient.get(`/reports/${selectedReport}`, {
        params,
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([res.data], {
        type: format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/html',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReport}-report-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'html'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <FileDown className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Reports</h1>
      </div>

      {/* Report type selection */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {(Object.entries(reportConfigs) as [ReportType, typeof reportConfigs.occupancy][]).map(
          ([key, config]) => {
            const Icon = config.icon;
            const isSelected = selectedReport === key;
            return (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover:border-primary/50 ${
                  isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''
                }`}
                onClick={() => setSelectedReport(key)}
              >
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <Icon className={`mb-3 h-8 w-8 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <h3 className="text-sm font-semibold">
                    {locale === 'ar' ? config.title_ar : config.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">{config.description}</p>
                </CardContent>
              </Card>
            );
          },
        )}
      </div>

      {/* Filters + download */}
      {selectedReport && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {locale === 'ar'
                ? reportConfigs[selectedReport].title_ar
                : reportConfigs[selectedReport].title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Format + Language */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Format</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormat('excel')}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                      format === 'excel' ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'
                    }`}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </button>
                  <button
                    onClick={() => setFormat('pdf')}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                      format === 'pdf' ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    PDF (HTML)
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Language</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLang('en')}
                    className={`flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                      lang === 'en' ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setLang('ar')}
                    className={`flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                      lang === 'ar' ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'
                    }`}
                  >
                    العربية
                  </button>
                </div>
              </div>
            </div>

            {/* Property filter */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Property (optional)</label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">All Properties</option>
                {(properties || []).map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {locale === 'ar' ? p.name_ar : p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date range (for payments and maintenance) */}
            {selectedReport !== 'occupancy' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">From</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">To</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Download button */}
            <div className="pt-2">
              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full"
                size="lg"
              >
                {downloading ? (
                  'Generating...'
                ) : (
                  <>
                    <FileDown className="me-2 h-4 w-4" />
                    Download {format === 'excel' ? 'Excel' : 'PDF'} Report
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
