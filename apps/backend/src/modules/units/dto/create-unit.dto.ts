import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UnitStatus, BudgetPeriod } from '@prisma/client';

export class CreateUnitDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Property UUID' })
  @IsUUID()
  @IsNotEmpty()
  property_id: string;

  @ApiProperty({ example: '101', description: 'Unit number (unique per property)' })
  @IsString()
  @IsNotEmpty()
  unit_number: string;

  @ApiPropertyOptional({ enum: UnitStatus, default: UnitStatus.vacant })
  @IsOptional()
  @IsEnum(UnitStatus)
  status?: UnitStatus;

  @ApiProperty({ example: 5000, description: 'Base monthly rent amount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  base_rent: number;

  @ApiProperty({ example: 85.5, description: 'Unit size in square feet' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  size_sqft: number;

  @ApiProperty({ example: 2, description: 'Number of bedrooms' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bedrooms: number;

  @ApiProperty({ example: 2, description: 'Number of bathrooms' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bathrooms: number;

  @ApiProperty({ example: 500, description: 'Maintenance budget amount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maintenance_budget: number;

  @ApiPropertyOptional({ enum: BudgetPeriod, default: BudgetPeriod.monthly, description: 'Maintenance budget period' })
  @IsOptional()
  @IsEnum(BudgetPeriod)
  maintenance_budget_period?: BudgetPeriod;

  @ApiPropertyOptional({ example: 'Corner unit with sea view', description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
