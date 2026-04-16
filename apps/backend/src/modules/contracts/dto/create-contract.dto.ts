import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentFrequency } from '@prisma/client';

export class CreateContractDto {
  @ApiProperty({ description: 'Tenant UUID', example: 'uuid-here' })
  @IsUUID()
  @IsNotEmpty()
  tenant_id: string;

  @ApiProperty({ description: 'Unit UUID', example: 'uuid-here' })
  @IsUUID()
  @IsNotEmpty()
  unit_id: string;

  @ApiProperty({ description: 'Contract start date (YYYY-MM-DD)', example: '2026-01-01' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: 'Contract end date (YYYY-MM-DD)', example: '2026-12-31' })
  @IsDateString()
  end_date: string;

  @ApiProperty({ description: 'Monthly / quarterly / yearly rent amount', example: 5000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  rent_amount: number;

  @ApiProperty({ enum: PaymentFrequency, description: 'Payment frequency' })
  @IsEnum(PaymentFrequency)
  payment_frequency: PaymentFrequency;

  @ApiPropertyOptional({ description: 'Grace period in days before a payment is overdue', example: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  grace_period_days?: number;

  @ApiPropertyOptional({ description: 'URL to the uploaded contract document' })
  @IsOptional()
  @IsString()
  document_url?: string;

  @ApiPropertyOptional({ description: 'Additional notes about the contract' })
  @IsOptional()
  @IsString()
  notes?: string;
}
