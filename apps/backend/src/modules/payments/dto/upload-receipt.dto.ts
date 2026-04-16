import { IsString, IsNotEmpty, IsDateString, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UploadReceiptDto {
  @ApiProperty({ description: 'ID of the payment schedule this payment applies to' })
  @IsString()
  @IsNotEmpty()
  payment_schedule_id: string;

  @ApiProperty({ description: 'URL of the uploaded receipt file' })
  @IsString()
  @IsNotEmpty()
  receipt_file_url: string;

  @ApiProperty({ description: 'Date the payment was made (ISO date string)' })
  @IsDateString()
  payment_date: string;

  @ApiProperty({ description: 'Amount paid by the tenant' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;
}
