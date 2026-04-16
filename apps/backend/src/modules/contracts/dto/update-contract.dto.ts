import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentFrequency } from '@prisma/client';

export class UpdateContractDto {
  @ApiPropertyOptional({ description: 'Contract start date (YYYY-MM-DD)', example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'Contract end date (YYYY-MM-DD)', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Rent amount', example: 5500 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  rent_amount?: number;

  @ApiPropertyOptional({ enum: PaymentFrequency })
  @IsOptional()
  @IsEnum(PaymentFrequency)
  payment_frequency?: PaymentFrequency;

  @ApiPropertyOptional({ description: 'Grace period in days', example: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  grace_period_days?: number;

  @ApiPropertyOptional({ description: 'URL to the uploaded contract document' })
  @IsOptional()
  @IsString()
  document_url?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
