import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { UnitStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryUnitDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Filter by property UUID' })
  @IsOptional()
  @IsUUID()
  property_id?: string;

  @ApiPropertyOptional({ enum: UnitStatus, description: 'Filter by unit status' })
  @IsOptional()
  @IsEnum(UnitStatus)
  status?: UnitStatus;

  @ApiPropertyOptional({ example: '10', description: 'Search by unit number (partial match)' })
  @IsOptional()
  @IsString()
  search?: string;
}
