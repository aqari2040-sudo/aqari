import { IsOptional, IsString, IsIn, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryPaymentDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['pending_review', 'confirmed', 'rejected'] })
  @IsOptional()
  @IsString()
  @IsIn(['pending_review', 'confirmed', 'rejected'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by tenant ID' })
  @IsOptional()
  @IsString()
  tenant_id?: string;

  @ApiPropertyOptional({ description: 'Filter by unit ID' })
  @IsOptional()
  @IsString()
  unit_id?: string;

  @ApiPropertyOptional({ description: 'Filter payments from this date (ISO date string)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Filter payments up to this date (ISO date string)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
