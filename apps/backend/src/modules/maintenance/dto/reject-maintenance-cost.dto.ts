import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectMaintenanceCostDto {
  @ApiProperty({ description: 'Reason for rejecting this cost entry' })
  @IsString()
  @IsNotEmpty()
  rejection_reason: string;
}
