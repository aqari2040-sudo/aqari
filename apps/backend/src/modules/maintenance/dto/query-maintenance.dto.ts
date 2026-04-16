import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenancePriority, MaintenanceStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryMaintenanceDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by unit UUID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  unit_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: MaintenanceStatus,
  })
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @ApiPropertyOptional({
    description: 'Filter by category UUID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    enum: MaintenancePriority,
  })
  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;

  @ApiPropertyOptional({
    description: 'Filter from date (ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (ISO 8601)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
