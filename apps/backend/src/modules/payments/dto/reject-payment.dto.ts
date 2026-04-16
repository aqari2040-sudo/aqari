import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectPaymentDto {
  @ApiProperty({ description: 'Reason for rejecting the payment' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  rejection_reason: string;
}
