import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { ReportsService } from './reports.service';
import { PdfGenerator } from './pdf.generator';
import { ExcelGenerator } from './excel.generator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly pdfGenerator: PdfGenerator,
    private readonly excelGenerator: ExcelGenerator,
  ) {}

  // ─── GET /reports/occupancy ──────────────────────────────

  @Get('occupancy')
  @Roles('owner')
  @ApiOperation({
    summary: 'Occupancy report — download as HTML (print-to-PDF) or Excel',
  })
  @ApiQuery({ name: 'format',      required: false, enum: ['pdf', 'excel'], description: 'Output format (default: pdf)' })
  @ApiQuery({ name: 'lang',        required: false, enum: ['en', 'ar'],     description: 'Report language (default: en)' })
  @ApiQuery({ name: 'property_id', required: false, type: String,           description: 'Filter by property ID (UUID)' })
  @ApiQuery({ name: 'from',        required: false, type: String,           description: 'Filter from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to',          required: false, type: String,           description: 'Filter to date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Occupancy report file download' })
  async occupancyReport(
    @Query('format')      format: string = 'pdf',
    @Query('lang')        lang: string = 'en',
    @Query('property_id') property_id?: string,
    @Query('from')        from?: string,
    @Query('to')          to?: string,
    @Res() res?: FastifyReply,
  ) {
    const safeRes = res!;
    const safeLang = (lang === 'ar' ? 'ar' : 'en') as 'en' | 'ar';

    const data = await this.reportsService.getOccupancyReportData({
      property_id,
      from,
      to,
    });

    if (format === 'excel') {
      const buffer = await this.excelGenerator.generateOccupancyReport(data, safeLang);
      safeRes.header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      safeRes.header('Content-Disposition', 'attachment; filename="occupancy-report.xlsx"');
      return safeRes.send(buffer);
    }

    const buffer = this.pdfGenerator.generateOccupancyReport(data, safeLang);
    safeRes.header('Content-Type', 'text/html; charset=utf-8');
    safeRes.header('Content-Disposition', 'attachment; filename="occupancy-report.html"');
    return safeRes.send(buffer);
  }

  // ─── GET /reports/payments ───────────────────────────────

  @Get('payments')
  @Roles('owner')
  @ApiOperation({
    summary: 'Payments report — download as HTML (print-to-PDF) or Excel',
  })
  @ApiQuery({ name: 'format',      required: false, enum: ['pdf', 'excel'] })
  @ApiQuery({ name: 'lang',        required: false, enum: ['en', 'ar'] })
  @ApiQuery({ name: 'property_id', required: false, type: String })
  @ApiQuery({ name: 'tenant_id',   required: false, type: String })
  @ApiQuery({ name: 'from',        required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to',          required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Payments report file download' })
  async paymentsReport(
    @Query('format')      format: string = 'pdf',
    @Query('lang')        lang: string = 'en',
    @Query('property_id') property_id?: string,
    @Query('tenant_id')   tenant_id?: string,
    @Query('from')        from?: string,
    @Query('to')          to?: string,
    @Res() res?: FastifyReply,
  ) {
    const safeRes = res!;
    const safeLang = (lang === 'ar' ? 'ar' : 'en') as 'en' | 'ar';

    const data = await this.reportsService.getPaymentsReportData({
      property_id,
      tenant_id,
      from,
      to,
    });

    if (format === 'excel') {
      const buffer = await this.excelGenerator.generatePaymentsReport(data, safeLang);
      safeRes.header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      safeRes.header('Content-Disposition', 'attachment; filename="payments-report.xlsx"');
      return safeRes.send(buffer);
    }

    const buffer = this.pdfGenerator.generatePaymentsReport(data, safeLang);
    safeRes.header('Content-Type', 'text/html; charset=utf-8');
    safeRes.header('Content-Disposition', 'attachment; filename="payments-report.html"');
    return safeRes.send(buffer);
  }

  // ─── GET /reports/maintenance ────────────────────────────

  @Get('maintenance')
  @Roles('owner')
  @ApiOperation({
    summary: 'Maintenance cost report — download as HTML (print-to-PDF) or Excel',
  })
  @ApiQuery({ name: 'format',      required: false, enum: ['pdf', 'excel'] })
  @ApiQuery({ name: 'lang',        required: false, enum: ['en', 'ar'] })
  @ApiQuery({ name: 'property_id', required: false, type: String })
  @ApiQuery({ name: 'unit_id',     required: false, type: String })
  @ApiQuery({ name: 'category_id', required: false, type: String })
  @ApiQuery({ name: 'from',        required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to',          required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Maintenance cost report file download' })
  async maintenanceReport(
    @Query('format')      format: string = 'pdf',
    @Query('lang')        lang: string = 'en',
    @Query('property_id') property_id?: string,
    @Query('unit_id')     unit_id?: string,
    @Query('category_id') category_id?: string,
    @Query('from')        from?: string,
    @Query('to')          to?: string,
    @Res() res?: FastifyReply,
  ) {
    const safeRes = res!;
    const safeLang = (lang === 'ar' ? 'ar' : 'en') as 'en' | 'ar';

    const data = await this.reportsService.getMaintenanceReportData({
      property_id,
      unit_id,
      category_id,
      from,
      to,
    });

    if (format === 'excel') {
      const buffer = await this.excelGenerator.generateMaintenanceReport(data, safeLang);
      safeRes.header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      safeRes.header('Content-Disposition', 'attachment; filename="maintenance-report.xlsx"');
      return safeRes.send(buffer);
    }

    const buffer = this.pdfGenerator.generateMaintenanceReport(data, safeLang);
    safeRes.header('Content-Type', 'text/html; charset=utf-8');
    safeRes.header('Content-Disposition', 'attachment; filename="maintenance-report.html"');
    return safeRes.send(buffer);
  }
}
