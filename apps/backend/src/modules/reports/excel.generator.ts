import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import type {
  OccupancyReportData,
  PaymentsReportData,
  MaintenanceReportData,
} from './reports.service';

// ─── Shared style constants ────────────────────────────────

const BRAND_BLUE = '2563EB';
const DARK_BLUE  = '1E3A5F';
const LIGHT_GRAY = 'F3F4F6';
const WHITE      = 'FFFFFF';

const headerFont: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: WHITE },
  size: 11,
};

const titleFont: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: DARK_BLUE },
  size: 14,
};

const brandFont: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: BRAND_BLUE },
  size: 18,
};

function headerFill(): ExcelJS.Fill {
  return {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: DARK_BLUE },
  };
}

function summaryFill(): ExcelJS.Fill {
  return {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: LIGHT_GRAY },
  };
}

function applyBorder(cell: ExcelJS.Cell): void {
  cell.border = {
    top:    { style: 'thin', color: { argb: 'D1D5DB' } },
    left:   { style: 'thin', color: { argb: 'D1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
    right:  { style: 'thin', color: { argb: 'D1D5DB' } },
  };
}

function applyHeaderStyle(row: ExcelJS.Row, colCount: number): void {
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i);
    cell.font = headerFont;
    cell.fill = headerFill();
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    applyBorder(cell);
  }
  row.height = 30;
}

function applyDataRow(row: ExcelJS.Row, colCount: number, even: boolean): void {
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i);
    cell.alignment = { vertical: 'middle', wrapText: true };
    if (even) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F9FAFB' },
      };
    }
    applyBorder(cell);
  }
  row.height = 22;
}

function addReportHeader(
  sheet: ExcelJS.Worksheet,
  title: string,
  generatedAt: string,
  colCount: number,
  isAr: boolean,
): void {
  // Brand row
  const brandRow = sheet.addRow(['Aqari']);
  brandRow.getCell(1).font = brandFont;
  sheet.mergeCells(`A${brandRow.number}:${colLetter(colCount)}${brandRow.number}`);
  brandRow.height = 36;

  // Title row
  const titleRow = sheet.addRow([title]);
  titleRow.getCell(1).font = titleFont;
  sheet.mergeCells(`A${titleRow.number}:${colLetter(colCount)}${titleRow.number}`);
  titleRow.height = 26;

  // Generated row
  const genLabel = isAr ? 'تاريخ التقرير' : 'Generated';
  const genRow = sheet.addRow([`${genLabel}: ${new Date(generatedAt).toLocaleString(isAr ? 'ar-AE' : 'en-AE')}`]);
  genRow.getCell(1).font = { color: { argb: '6B7280' }, size: 10 };
  sheet.mergeCells(`A${genRow.number}:${colLetter(colCount)}${genRow.number}`);
  genRow.height = 18;

  sheet.addRow([]); // spacer
}

function colLetter(n: number): string {
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function setRtl(sheet: ExcelJS.Worksheet): void {
  sheet.views = [{ rightToLeft: true }];
}

@Injectable()
export class ExcelGenerator {
  // ─── Occupancy Report ─────────────────────────────────────

  async generateOccupancyReport(
    data: OccupancyReportData,
    lang: 'en' | 'ar',
  ): Promise<Buffer> {
    const isAr = lang === 'ar';
    const currency = isAr ? 'د.إ' : 'AED';
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Aqari';
    workbook.created = new Date();

    // ── Summary sheet ─────────────────────────────────────
    const summarySheet = workbook.addWorksheet(isAr ? 'ملخص' : 'Summary');
    if (isAr) setRtl(summarySheet);
    summarySheet.columns = [
      { width: 30 },
      { width: 20 },
    ];

    addReportHeader(
      summarySheet,
      isAr ? 'تقرير الإشغال — ملخص' : 'Occupancy Report — Summary',
      data.generated_at,
      2,
      isAr,
    );

    const summaryLabels: [string, string, string | number][] = [
      [isAr ? 'إجمالي الوحدات' : 'Total Units',            '', data.totals.total_units],
      [isAr ? 'مشغول' : 'Occupied',                         '', data.totals.occupied],
      [isAr ? 'شاغر' : 'Vacant',                            '', data.totals.vacant],
      [isAr ? 'تحت الصيانة' : 'Under Maintenance',          '', data.totals.under_maintenance],
      [isAr ? 'نسبة الإشغال (%)' : 'Occupancy Rate (%)',    '', data.totals.occupancy_rate],
    ];

    summaryLabels.forEach(([label, , value]) => {
      const row = summarySheet.addRow([label, value]);
      row.getCell(1).font = { bold: true, size: 11 };
      row.getCell(2).font = { color: { argb: BRAND_BLUE }, bold: true, size: 12 };
      row.getCell(1).fill = summaryFill();
      row.getCell(2).fill = summaryFill();
      applyBorder(row.getCell(1));
      applyBorder(row.getCell(2));
      row.height = 24;
    });

    // ── Detail sheet ──────────────────────────────────────
    const detailSheet = workbook.addWorksheet(isAr ? 'تفاصيل الوحدات' : 'Unit Details');
    if (isAr) setRtl(detailSheet);
    detailSheet.columns = [
      { width: 28 },
      { width: 28 },
      { width: 18 },
      { width: 14 },
      { width: 20 },
      { width: 30 },
      { width: 30 },
    ];

    const colCount = 7;
    addReportHeader(
      detailSheet,
      isAr ? 'تقرير الإشغال — تفاصيل الوحدات' : 'Occupancy Report — Unit Details',
      data.generated_at,
      colCount,
      isAr,
    );

    const headers = isAr
      ? ['العقار', 'الوحدة', 'الحالة', `الإيجار (${currency})`, 'نسبة الإشغال (%)', 'المستأجر', 'المستأجر (عربي)']
      : ['Property', 'Unit', 'Status', `Base Rent (${currency})`, 'Occ. Rate (%)', 'Tenant', 'Tenant (AR)'];

    const headerRow = detailSheet.addRow(headers);
    applyHeaderStyle(headerRow, colCount);

    let rowIndex = 0;
    for (const prop of data.properties) {
      for (const unit of prop.units) {
        rowIndex++;
        const row = detailSheet.addRow([
          isAr ? prop.name_ar : prop.name,
          unit.unit_number,
          isAr ? this.statusLabelAr(unit.status) : unit.status,
          unit.base_rent,
          prop.occupancy_rate,
          unit.tenant_name ?? '',
          unit.tenant_name_ar ?? '',
        ]);
        applyDataRow(row, colCount, rowIndex % 2 === 0);
        // Colour-code status
        const statusCell = row.getCell(3);
        if (unit.status === 'occupied') {
          statusCell.font = { color: { argb: '065F46' }, bold: true };
        } else if (unit.status === 'vacant') {
          statusCell.font = { color: { argb: '991B1B' }, bold: true };
        } else {
          statusCell.font = { color: { argb: '92400E' }, bold: true };
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ─── Payments Report ──────────────────────────────────────

  async generatePaymentsReport(
    data: PaymentsReportData,
    lang: 'en' | 'ar',
  ): Promise<Buffer> {
    const isAr = lang === 'ar';
    const currency = isAr ? 'د.إ' : 'AED';
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Aqari';
    workbook.created = new Date();

    // ── Summary sheet ─────────────────────────────────────
    const summarySheet = workbook.addWorksheet(isAr ? 'ملخص' : 'Summary');
    if (isAr) setRtl(summarySheet);
    summarySheet.columns = [{ width: 32 }, { width: 22 }];

    addReportHeader(
      summarySheet,
      isAr ? 'تقرير المدفوعات — ملخص' : 'Payments Report — Summary',
      data.generated_at,
      2,
      isAr,
    );

    // Period row
    const periodRow = summarySheet.addRow([
      isAr ? 'الفترة' : 'Period',
      `${data.period.from} — ${data.period.to}`,
    ]);
    periodRow.getCell(1).font = { bold: true };
    applyBorder(periodRow.getCell(1));
    applyBorder(periodRow.getCell(2));
    periodRow.height = 22;

    const summaryRows: [string, number][] = [
      [isAr ? `إجمالي المستحق (${currency})` : `Total Due (${currency})`,               data.summary.total_due],
      [isAr ? `إجمالي المحصل (${currency})` : `Total Collected (${currency})`,           data.summary.total_collected],
      [isAr ? `إجمالي المتأخر (${currency})` : `Total Overdue (${currency})`,            data.summary.total_overdue],
      [isAr ? 'نسبة التحصيل (%)' : 'Collection Rate (%)',                                data.summary.collection_rate],
    ];

    summaryRows.forEach(([label, value]) => {
      const row = summarySheet.addRow([label, value]);
      row.getCell(1).font = { bold: true, size: 11 };
      row.getCell(2).font = { color: { argb: BRAND_BLUE }, bold: true, size: 12 };
      row.getCell(1).fill = summaryFill();
      row.getCell(2).fill = summaryFill();
      applyBorder(row.getCell(1));
      applyBorder(row.getCell(2));
      row.height = 24;
    });

    // ── Detail sheet ──────────────────────────────────────
    const detailSheet = workbook.addWorksheet(isAr ? 'تفاصيل المدفوعات' : 'Payment Details');
    if (isAr) setRtl(detailSheet);

    const colCount = 7;
    detailSheet.columns = [
      { width: 30 },
      { width: 30 },
      { width: 18 },
      { width: 24 },
      { width: 16 },
      { width: 20 },
      { width: 20 },
    ];

    addReportHeader(
      detailSheet,
      isAr ? 'تقرير المدفوعات — التفاصيل' : 'Payments Report — Details',
      data.generated_at,
      colCount,
      isAr,
    );

    const headers = isAr
      ? ['المستأجر', 'المستأجر (عربي)', 'الوحدة', 'العقار', 'تاريخ الاستحقاق', `المستحق (${currency})`, `المدفوع (${currency})`]
      : ['Tenant', 'Tenant (AR)', 'Unit', 'Property', 'Due Date', `Due (${currency})`, `Paid (${currency})`];

    // We actually do 8 cols with status
    const headersWithStatus = isAr
      ? [...headers, 'الحالة']
      : [...headers, 'Status'];
    const finalColCount = headersWithStatus.length;

    detailSheet.spliceColumns(1, 0); // reset
    const allCols = [
      { width: 28 }, { width: 28 }, { width: 16 }, { width: 24 },
      { width: 14 }, { width: 18 }, { width: 18 }, { width: 14 },
    ];
    detailSheet.columns = allCols;

    const headerRow = detailSheet.addRow(headersWithStatus);
    applyHeaderStyle(headerRow, finalColCount);

    data.payments.forEach((p, i) => {
      const row = detailSheet.addRow([
        p.tenant_name,
        p.tenant_name_ar,
        p.unit_number,
        p.property_name,
        p.due_date,
        p.amount_due,
        p.amount_paid,
        isAr ? this.statusLabelAr(p.status) : p.status,
      ]);
      applyDataRow(row, finalColCount, i % 2 === 0);
      // Colour status
      const statusCell = row.getCell(8);
      if (p.status === 'paid') statusCell.font = { color: { argb: '065F46' }, bold: true };
      else if (p.status === 'overdue') statusCell.font = { color: { argb: '991B1B' }, bold: true };
      else statusCell.font = { color: { argb: '0369A1' }, bold: true };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ─── Maintenance Report ───────────────────────────────────

  async generateMaintenanceReport(
    data: MaintenanceReportData,
    lang: 'en' | 'ar',
  ): Promise<Buffer> {
    const isAr = lang === 'ar';
    const currency = isAr ? 'د.إ' : 'AED';
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Aqari';
    workbook.created = new Date();

    // ── Summary sheet ─────────────────────────────────────
    const summarySheet = workbook.addWorksheet(isAr ? 'ملخص' : 'Summary');
    if (isAr) setRtl(summarySheet);
    summarySheet.columns = [{ width: 34 }, { width: 22 }];

    addReportHeader(
      summarySheet,
      isAr ? 'تقرير الصيانة — ملخص' : 'Maintenance Report — Summary',
      data.generated_at,
      2,
      isAr,
    );

    // Period
    const periodRow = summarySheet.addRow([
      isAr ? 'الفترة' : 'Period',
      `${data.period.from} — ${data.period.to}`,
    ]);
    periodRow.getCell(1).font = { bold: true };
    applyBorder(periodRow.getCell(1));
    applyBorder(periodRow.getCell(2));
    periodRow.height = 22;

    const summaryRows: [string, number][] = [
      [isAr ? 'إجمالي الطلبات' : 'Total Requests',                   data.summary.total_requests],
      [isAr ? `إجمالي التكلفة (${currency})` : `Total Cost (${currency})`, data.summary.total_cost],
      [isAr ? `متوسط التكلفة (${currency})` : `Avg Cost (${currency})`,   data.summary.avg_cost],
    ];

    summaryRows.forEach(([label, value]) => {
      const row = summarySheet.addRow([label, value]);
      row.getCell(1).font = { bold: true, size: 11 };
      row.getCell(2).font = { color: { argb: BRAND_BLUE }, bold: true, size: 12 };
      row.getCell(1).fill = summaryFill();
      row.getCell(2).fill = summaryFill();
      applyBorder(row.getCell(1));
      applyBorder(row.getCell(2));
      row.height = 24;
    });

    summarySheet.addRow([]);

    // Category breakdown
    const catHeaderRow = summarySheet.addRow(
      isAr
        ? ['الفئة', 'العدد', `إجمالي التكلفة (${currency})`]
        : ['Category', 'Count', `Total Cost (${currency})`],
    );
    applyHeaderStyle(catHeaderRow, 3);
    summarySheet.getColumn(3).width = 22;

    data.by_category.forEach((cat, i) => {
      const row = summarySheet.addRow([
        isAr ? cat.category_ar : cat.category,
        cat.count,
        cat.total_cost,
      ]);
      applyDataRow(row, 3, i % 2 === 0);
    });

    // ── Requests Detail sheet ─────────────────────────────
    const detailSheet = workbook.addWorksheet(isAr ? 'تفاصيل الطلبات' : 'Request Details');
    if (isAr) setRtl(detailSheet);
    detailSheet.columns = [
      { width: 16 }, { width: 24 }, { width: 22 }, { width: 40 },
      { width: 14 }, { width: 18 }, { width: 20 }, { width: 14 },
    ];

    const colCount = 8;
    addReportHeader(
      detailSheet,
      isAr ? 'تقرير الصيانة — تفاصيل الطلبات' : 'Maintenance Report — Request Details',
      data.generated_at,
      colCount,
      isAr,
    );

    const headers = isAr
      ? ['الوحدة', 'العقار', 'الفئة', 'الوصف', 'الأولوية', 'الحالة', `التكلفة (${currency})`, 'التاريخ']
      : ['Unit', 'Property', 'Category', 'Description', 'Priority', 'Status', `Cost (${currency})`, 'Date'];

    const headerRow = detailSheet.addRow(headers);
    applyHeaderStyle(headerRow, colCount);

    data.requests.forEach((req, i) => {
      const row = detailSheet.addRow([
        req.unit_number,
        req.property_name,
        isAr ? req.category_ar : req.category,
        req.description,
        isAr ? this.statusLabelAr(req.priority) : req.priority,
        isAr ? this.statusLabelAr(req.status) : req.status,
        req.total_cost,
        req.created_at,
      ]);
      applyDataRow(row, colCount, i % 2 === 0);

      // Priority colour
      const priorityCell = row.getCell(5);
      if (req.priority === 'high') priorityCell.font = { color: { argb: '991B1B' }, bold: true };
      else if (req.priority === 'medium') priorityCell.font = { color: { argb: '92400E' }, bold: true };
      else priorityCell.font = { color: { argb: '065F46' }, bold: true };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ─── Private helpers ──────────────────────────────────────

  private statusLabelAr(status: string): string {
    const map: Record<string, string> = {
      occupied:          'مشغول',
      vacant:            'شاغر',
      under_maintenance: 'تحت الصيانة',
      paid:              'مدفوع',
      overdue:           'متأخر',
      pending:           'معلق',
      partial:           'جزئي',
      high:              'عالية',
      medium:            'متوسطة',
      low:               'منخفضة',
      submitted:         'مقدم',
      in_progress:       'قيد التنفيذ',
      completed:         'مكتمل',
      cancelled:         'ملغى',
      blocked_duplicate: 'مكرر',
    };
    return map[status] ?? status;
  }
}
