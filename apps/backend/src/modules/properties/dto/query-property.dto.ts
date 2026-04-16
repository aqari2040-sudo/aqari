import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PropertyType } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryPropertyDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search by name or Arabic name (case-insensitive)',
    example: 'tower',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: PropertyType,
    description: 'Filter by property type',
  })
  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;
}
