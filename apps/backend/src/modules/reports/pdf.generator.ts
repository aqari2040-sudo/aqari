import { Injectable } from '@nestjs/common';
import type {
  OccupancyReportData,
  PaymentsReportData,
  MaintenanceReportData,
} from './reports.service';

@Injectable()
export class PdfGenerator {
  // ─── Shared helpers ──────────────────────────────────────

  private formatMoney(amount: number): string {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private sharedStyles(isAr: boolean): string {
    return `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: ${isAr ? "'IBM Plex Sans Arabic', 'Arial'" : 'Arial, sans-serif'};
        padding: 40px;
        direction: ${isAr ? 'rtl' : 'ltr'};
        color: #111827;
        font-size: 13px;
        line-height: 1.5;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 3px solid #2563EB;
        padding-bottom: 16px;
        margin-bottom: 24px;
      }
      .header-brand { font-size: 28px; font-weight: 700; color: #2563EB; letter-spacing: -0.5px; }
      .header-meta { font-size: 12px; color: #6b7280; text-align: ${isAr ? 'left' : 'right'}; }
      h1 { font-size: 20px; font-weight: 700; color: #1e3a5f; margin-bottom: 4px; }
      h2 { font-size: 15px; font-weight: 600; color: #1e3a5f; margin: 24px 0 12px; }
      .summary {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        margin: 20px 0 28px;
      }
      .card {
        padding: 16px 20px;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        min-width: 130px;
        background: #f9fafb;
      }
      .card-value { font-size: 22px; font-weight: 700; color: #2563EB; }
      .card-label { font-size: 11px; color: #6b7280; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
      th {
        background: #1e3a5f;
        color: #fff;
        padding: 9px 10px;
        text-align: ${isAr ? 'right' : 'left'};
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }
      td { border-bottom: 1px solid #e5e7eb; padding: 8px 10px; vertical-align: top; }
      tr:nth-child(even) td { background: #f9fafb; }
      .property-block { margin-bottom: 32px; }
      .property-title {
        font-size: 14px;
        font-weight: 600;
        background: #eff6ff;
        border-left: 4px solid #2563EB;
        padding: 8px 12px;
        margin-bottom: 8px;
        color: #1e40af;
      }
      .badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 99px;
        font-size: 11px;
        font-weight: 600;
      }
      .badge-occupied  { background: #d1fae5; color: #065f46; }
      .badge-vacant    { background: #fee2e2; color: #991b1b; }
      .badge-maintenance { background: #fef3c7; color: #92400e; }
      .badge-paid      { background: #d1fae5; color: #065f46; }
      .badge-overdue   { background: #fee2e2; color: #991b1b; }
      .badge-pending   { background: #e0f2fe; color: #0369a1; }
      .badge-partial   { background: #fef3c7; color: #92400e; }
      .badge-high      { background: #fee2e2; color: #991b1b; }
      .badge-medium    { background: #fef3c7; color: #92400e; }
      .badge-low       { background: #d1fae5; color: #065f46; }
      .footer {
        margin-top: 48px;
        padding-top: 12px;
        border-top: 1px solid #e5e7eb;
        font-size: 10px;
        color: #9ca3af;
        display: flex;
        justify-content: space-between;
      }
      @media print {
        body { padding: 20px; }
        .property-block { page-break-inside: avoid; }
      }
    </style>`;
  }

  private badgeClass(value: string): string {
    const map: Record<string, string> = {
      occupied: 'badge-occupied',
      vacant: 'badge-vacant',
      under_maintenance: 'badge-maintenance',
      paid: 'badge-paid',
      overdue: 'badge-overdue',
      pending: 'badge-pending',
      partial: 'badge-partial',
      high: 'badge-high',
      medium: 'badge-medium',
      low: 'badge-low',
    };
    return `badge ${map[value] ?? ''}`;
  }

  private labelMap(
    key: string,
    isAr: boolean,
  ): Record<string, string> {
    const labels: Record<string, [string, string]> = {
      unit_number:       ['Unit',           'الوحدة'],
      status:            ['Status',         'الحالة'],
      base_rent:         ['Base Rent',      'الإيجار'],
      tenant:            ['Tenant',         'المستأجر'],
      property:          ['Property',       'العقار'],
      due_date:          ['Due Date',       'تاريخ الاستحقاق'],
      amount_due:        ['Amount Due',     'المبلغ المستحق'],
      amount_paid:       ['Amount Paid',    'المبلغ المدفوع'],
      category:          ['Category',       'الفئة'],
      description:       ['Description',    'الوصف'],
      priority:          ['Priority',       'الأولوية'],
      cost:              ['Cost (AED)',      'التكلفة (د.إ)'],
      date:              ['Date',           'التاريخ'],
      count:             ['Count',          'العدد'],
      total_cost:        ['Total Cost',     'إجمالي التكلفة'],
    };
    const pair = labels[key];
    if (!pair) return {};
    return { [key]: isAr ? pair[1] : pair[0] };
  }

  private statusLabel(status: string, isAr: boolean): string {
    const map: Record<string, [string, string]> = {
      occupied:          ['Occupied',        'مشغول'],
      vacant:            ['Vacant',          'شاغر'],
      under_maintenance: ['Maintenance',     'تحت الصيانة'],
      paid:              ['Paid',            'مدفوع'],
      overdue:           ['Overdue',         'متأخر'],
      pending:           ['Pending',         'معلق'],
      partial:           ['Partial',         'جزئي'],
      high:              ['High',            'عالية'],
      medium:            ['Medium',          'متوسطة'],
      low:               ['Low',             'منخفضة'],
      submitted:         ['Submitted',       'مقدم'],
      in_progress:       ['In Progress',     'قيد التنفيذ'],
      completed:         ['Completed',       'مكتمل'],
      cancelled:         ['Cancelled',       'ملغى'],
      blocked_duplicate: ['Duplicate',       'مكرر'],
    };
    const pair = map[status];
    if (!pair) return status;
    return isAr ? pair[1] : pair[0];
  }

  // ─── Occupancy Report ─────────────────────────────────────

  generateOccupancyReport(data: OccupancyReportData, lang: 'en' | 'ar'): Buffer {
    const isAr = lang === 'ar';
    const title = isAr ? 'تقرير الإشغال' : 'Occupancy Report';
    const currency = isAr ? 'د.إ' : 'AED';

    const summaryCards = `
      <div class="summary">
        <div class="card">
          <div class="card-value">${data.totals.total_units}</div>
          <div class="card-label">${isAr ? 'إجمالي الوحدات' : 'Total Units'}</div>
        </div>
        <div class="card">
          <div class="card-value" style="color:#059669">${data.totals.occupied}</div>
          <div class="card-label">${isAr ? 'مشغول' : 'Occupied'}</div>
        </div>
        <div class="card">
          <div class="card-value" style="color:#dc2626">${data.totals.vacant}</div>
          <div class="card-label">${isAr ? 'شاغر' : 'Vacant'}</div>
        </div>
        <div class="card">
          <div class="card-value" style="color:#d97706">${data.totals.under_maintenance}</div>
          <div class="card-label">${isAr ? 'تحت الصيانة' : 'Under Maintenance'}</div>
        </div>
        <div class="card">
          <div class="card-value">${data.totals.occupancy_rate}%</div>
          <div class="card-label">${isAr ? 'نسبة الإشغال' : 'Occupancy Rate'}</div>
        </div>
      </div>`;

    const propertyBlocks = data.properties
      .map((prop) => {
        const propName = isAr ? prop.name_ar : prop.name;
        const rows = prop.units
          .map(
            (unit) => `
          <tr>
            <td>${unit.unit_number}</td>
            <td><span class="${this.badgeClass(unit.status)}">${this.statusLabel(unit.status, isAr)}</span></td>
            <td>${currency} ${this.formatMoney(unit.base_rent)}</td>
            <td>${isAr ? (unit.tenant_name_ar ?? '—') : (unit.tenant_name ?? '—')}</td>
          </tr>`,
          )
          .join('');

        return `
        <div class="property-block">
          <div class="property-title">
            ${propName}
            &nbsp;·&nbsp;
            ${isAr ? 'الإشغال' : 'Occupancy'}: ${prop.occupancy_rate}%
            &nbsp;·&nbsp;
            ${prop.total_units} ${isAr ? 'وحدة' : 'units'}
          </div>
          <table>
            <thead>
              <tr>
                <th>${isAr ? 'الوحدة' : 'Unit'}</th>
                <th>${isAr ? 'الحالة' : 'Status'}</th>
                <th>${isAr ? `الإيجار (${currency})` : `Rent (${currency})`}</th>
                <th>${isAr ? 'المستأجر' : 'Tenant'}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html dir="${isAr ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  ${this.sharedStyles(isAr)}
</head>
<body>
  <div class="header">
    <div>
      <div class="header-brand">Aqari</div>
      <h1>${title}</h1>
    </div>
    <div class="header-meta">
      <div>${isAr ? 'تاريخ التقرير' : 'Generated'}</div>
      <div>${new Date(data.generated_at).toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-AE')}</div>
    </div>
  </div>

  ${summaryCards}

  <h2>${isAr ? 'تفاصيل العقارات' : 'Property Details'}</h2>
  ${propertyBlocks}

  <div class="footer">
    <span>${isAr ? 'عقاري — نظام إدارة العقارات' : 'Aqari — Property Management System'}</span>
    <span>${isAr ? 'سري وللاستخدام الداخلي فقط' : 'Confidential — Internal Use Only'}</span>
  </div>
</body>
</html>`;

    return Buffer.from(html, 'utf-8');
  }

  // ─── Payments Report ──────────────────────────────────────

  generatePaymentsReport(data: PaymentsReportData, lang: 'en' | 'ar'): Buffer {
    const isAr = lang === 'ar';
    const title = isAr ? 'تقرير المدفوعات' : 'Payments Report';
    const currency = isAr ? 'د.إ' : 'AED';

    const summaryCards = `
      <div class="summary">
        <div class="card">
          <div class="card-value">${currency} ${this.formatMoney(data.summary.total_due)}</div>
          <div class="card-label">${isAr ? 'إجمالي المستحق' : 'Total Due'}</div>
        </div>
        <div class="card">
          <div class="card-value" style="color:#059669">${currency} ${this.formatMoney(data.summary.total_collected)}</div>
          <div class="card-label">${isAr ? 'إجمالي المحصل' : 'Total Collected'}</div>
        </div>
        <div class="card">
          <div class="card-value" style="color:#dc2626">${currency} ${this.formatMoney(data.summary.total_overdue)}</div>
          <div class="card-label">${isAr ? 'إجمالي المتأخر' : 'Total Overdue'}</div>
        </div>
        <div class="card">
          <div class="card-value">${data.summary.collection_rate}%</div>
          <div class="card-label">${isAr ? 'نسبة التحصيل' : 'Collection Rate'}</div>
        </div>
      </div>`;

    const rows = data.payments
      .map(
        (p) => `
        <tr>
          <td>${isAr ? p.tenant_name_ar : p.tenant_name}</td>
          <td>${p.unit_number}</td>
          <td>${p.property_name}</td>
          <td>${p.due_date}</td>
          <td>${currency} ${this.formatMoney(p.amount_due)}</td>
          <td>${currency} ${this.formatMoney(p.amount_paid)}</td>
          <td><span class="${this.badgeClass(p.status)}">${this.statusLabel(p.status, isAr)}</span></td>
        </tr>`,
      )
      .join('');

    const periodLabel = isAr
      ? `${isAr ? 'الفترة' : 'Period'}: ${data.period.from} — ${data.period.to}`
      : `Period: ${data.period.from} — ${data.period.to}`;

    const html = `<!DOCTYPE html>
<html dir="${isAr ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  ${this.sharedStyles(isAr)}
</head>
<body>
  <div class="header">
    <div>
      <div class="header-brand">Aqari</div>
      <h1>${title}</h1>
      <div style="font-size:12px;color:#6b7280;margin-top:4px">${periodLabel}</div>
    </div>
    <div class="header-meta">
      <div>${isAr ? 'تاريخ التقرير' : 'Generated'}</div>
      <div>${new Date(data.generated_at).toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-AE')}</div>
    </div>
  </div>

  ${summaryCards}

  <h2>${isAr ? 'تفاصيل جداول الدفع' : 'Payment Schedule Details'}</h2>
  <table>
    <thead>
      <tr>
        <th>${isAr ? 'المستأجر' : 'Tenant'}</th>
        <th>${isAr ? 'الوحدة' : 'Unit'}</th>
        <th>${isAr ? 'العقار' : 'Property'}</th>
        <th>${isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
        <th>${isAr ? `المستحق (${currency})` : `Due (${currency})`}</th>
        <th>${isAr ? `المدفوع (${currency})` : `Paid (${currency})`}</th>
        <th>${isAr ? 'الحالة' : 'Status'}</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:24px">${isAr ? 'لا توجد بيانات' : 'No data found'}</td></tr>`}</tbody>
  </table>

  <div class="footer">
    <span>${isAr ? 'عقاري — نظام إدارة العقارات' : 'Aqari — Property Management System'}</span>
    <span>${isAr ? 'سري وللاستخدام الداخلي فقط' : 'Confidential — Internal Use Only'}</span>
  </div>
</body>
</html>`;

    return Buffer.from(html, 'utf-8');
  }

  // ─── Maintenance Report ───────────────────────────────────

  generateMaintenanceReport(data: MaintenanceReportData, lang: 'en' | 'ar'): Buffer {
    const isAr = lang === 'ar';
    const title = isAr ? 'تقرير الصيانة' : 'Maintenance Cost Report';
    const currency = isAr ? 'د.إ' : 'AED';

    const summaryCards = `
      <div class="summary">
        <div class="card">
          <div class="card-value">${data.summary.total_requests}</div>
          <div class="card-label">${isAr ? 'إجمالي الطلبات' : 'Total Requests'}</div>
        </div>
        <div class="card">
          <div class="card-value">${currency} ${this.formatMoney(data.summary.total_cost)}</div>
          <div class="card-label">${isAr ? 'إجمالي التكلفة' : 'Total Cost'}</div>
        </div>
        <div class="card">
          <div class="card-value">${currency} ${this.formatMoney(data.summary.avg_cost)}</div>
          <div class="card-label">${isAr ? 'متوسط التكلفة' : 'Average Cost'}</div>
        </div>
      </div>`;

    const categoryRows = data.by_category
      .map(
        (cat) => `
        <tr>
          <td>${isAr ? cat.category_ar : cat.category}</td>
          <td>${cat.count}</td>
          <td>${currency} ${this.formatMoney(cat.total_cost)}</td>
        </tr>`,
      )
      .join('');

    const requestRows = data.requests
      .map(
        (req) => `
        <tr>
          <td>${req.unit_number}</td>
          <td>${req.property_name}</td>
          <td>${isAr ? req.category_ar : req.category}</td>
          <td style="max-width:200px;word-break:break-word">${req.description}</td>
          <td><span class="${this.badgeClass(req.priority)}">${this.statusLabel(req.priority, isAr)}</span></td>
          <td><span class="${this.badgeClass(req.status)}">${this.statusLabel(req.status, isAr)}</span></td>
          <td>${currency} ${this.formatMoney(req.total_cost)}</td>
          <td>${req.created_at}</td>
        </tr>`,
      )
      .join('');

    const periodLabel = isAr
      ? `الفترة: ${data.period.from} — ${data.period.to}`
      : `Period: ${data.period.from} — ${data.period.to}`;

    const html = `<!DOCTYPE html>
<html dir="${isAr ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  ${this.sharedStyles(isAr)}
</head>
<body>
  <div class="header">
    <div>
      <div class="header-brand">Aqari</div>
      <h1>${title}</h1>
      <div style="font-size:12px;color:#6b7280;margin-top:4px">${periodLabel}</div>
    </div>
    <div class="header-meta">
      <div>${isAr ? 'تاريخ التقرير' : 'Generated'}</div>
      <div>${new Date(data.generated_at).toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-AE')}</div>
    </div>
  </div>

  ${summaryCards}

  <h2>${isAr ? 'ملخص حسب الفئة' : 'Summary by Category'}</h2>
  <table>
    <thead>
      <tr>
        <th>${isAr ? 'الفئة' : 'Category'}</th>
        <th>${isAr ? 'العدد' : 'Count'}</th>
        <th>${isAr ? `إجمالي التكلفة (${currency})` : `Total Cost (${currency})`}</th>
      </tr>
    </thead>
    <tbody>${categoryRows || `<tr><td colspan="3" style="text-align:center;color:#9ca3af;padding:24px">${isAr ? 'لا توجد بيانات' : 'No data found'}</td></tr>`}</tbody>
  </table>

  <h2>${isAr ? 'تفاصيل طلبات الصيانة' : 'Maintenance Request Details'}</h2>
  <table>
    <thead>
      <tr>
        <th>${isAr ? 'الوحدة' : 'Unit'}</th>
        <th>${isAr ? 'العقار' : 'Property'}</th>
        <th>${isAr ? 'الفئة' : 'Category'}</th>
        <th>${isAr ? 'الوصف' : 'Description'}</th>
        <th>${isAr ? 'الأولوية' : 'Priority'}</th>
        <th>${isAr ? 'الحالة' : 'Status'}</th>
        <th>${isAr ? `التكلفة (${currency})` : `Cost (${currency})`}</th>
        <th>${isAr ? 'التاريخ' : 'Date'}</th>
      </tr>
    </thead>
    <tbody>${requestRows || `<tr><td colspan="8" style="text-align:center;color:#9ca3af;padding:24px">${isAr ? 'لا توجد بيانات' : 'No data found'}</td></tr>`}</tbody>
  </table>

  <div class="footer">
    <span>${isAr ? 'عقاري — نظام إدارة العقارات' : 'Aqari — Property Management System'}</span>
    <span>${isAr ? 'سري وللاستخدام الداخلي فقط' : 'Confidential — Internal Use Only'}</span>
  </div>
</body>
</html>`;

    return Buffer.from(html, 'utf-8');
  }
}
