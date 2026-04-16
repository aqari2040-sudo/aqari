import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenancePriority } from '@prisma/client';

export class CreateMaintenanceDto {
  @ApiProperty({ description: 'Unit UUID', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  unit_id: string;

  @ApiProperty({ description: 'Maintenance category UUID', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  category_id: string;

  @ApiProperty({ description: 'Description of the issue' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Array of photo storage URLs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  photos?: string[];

  @ApiPropertyOptional({
    description: 'Priority level',
    enum: MaintenancePriority,
    default: MaintenancePriority.medium,
  })
  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;
}
