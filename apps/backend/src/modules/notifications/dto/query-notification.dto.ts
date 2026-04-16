import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryNotificationDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by read status',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  is_read?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by notification type',
    example: 'overdue_rent',
    enum: [
      'overdue_rent',
      'contract_expiry',
      'maintenance_update',
      'cost_pending',
      'cost_approved',
      'cost_rejected',
      'receipt_confirmed',
      'receipt_rejected',
      'suspicious_cost',
      'recurring_maintenance',
      'budget_exceeded',
    ],
  })
  @IsOptional()
  @IsString()
  type?: string;
}
