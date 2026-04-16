import { IsOptional, IsString, IsIn, IsDateString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryAuditLogDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by the user who performed the action (UUID)' })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({ description: 'Filter by the audited table name (e.g. "contract", "unit")' })
  @IsOptional()
  @IsString()
  table_name?: string;

  @ApiPropertyOptional({ enum: ['create', 'update', 'delete'], description: 'Filter by action type' })
  @IsOptional()
  @IsIn(['create', 'update', 'delete'])
  action?: 'create' | 'update' | 'delete';

  @ApiPropertyOptional({ description: 'Include logs from this date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Include logs up to this date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Filter by the UUID of the affected record' })
  @IsOptional()
  @IsUUID()
  record_id?: string;

  @ApiPropertyOptional({ description: 'Full-text search across changed fields / description' })
  @IsOptional()
  @IsString()
  search?: string;
}
