import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { OcrService } from './ocr.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, OcrService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
