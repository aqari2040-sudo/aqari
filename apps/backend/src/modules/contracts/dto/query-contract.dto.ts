import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ContractStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryContractDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: ContractStatus,
    description: 'Filter by contract status',
  })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @ApiPropertyOptional({
    description: 'Return contracts whose end_date falls within the next N days',
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  expiring_within_days?: number;

  @ApiPropertyOptional({ description: 'Filter by tenant UUID' })
  @IsOptional()
  @IsUUID()
  tenant_id?: string;

  @ApiPropertyOptional({ description: 'Filter by unit UUID' })
  @IsOptional()
  @IsUUID()
  unit_id?: string;
}
