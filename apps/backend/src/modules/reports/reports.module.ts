import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PdfGenerator } from './pdf.generator';
import { ExcelGenerator } from './excel.generator';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, PdfGenerator, ExcelGenerator],
  exports: [ReportsService],
})
export class ReportsModule {}
