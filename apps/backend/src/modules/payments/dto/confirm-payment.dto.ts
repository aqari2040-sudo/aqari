import { IsNumber, IsPositive, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ConfirmPaymentDto {
  @ApiProperty({ description: 'Confirmed payment amount' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  confirmed_amount: number;

  @ApiProperty({ description: 'Confirmed payment date (ISO date string)' })
  @IsDateString()
  confirmed_date: string;
}
