import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { PropertyType } from '@prisma/client';

export class CreatePropertyDto {
  @ApiProperty({ example: 'Al Noor Tower' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'برج النور' })
  @IsString()
  @IsNotEmpty()
  name_ar: string;

  @ApiProperty({ enum: PropertyType, example: PropertyType.tower })
  @IsEnum(PropertyType)
  type: PropertyType;

  @ApiProperty({ example: '123 Main Street, Dubai' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: '١٢٣ الشارع الرئيسي، دبي' })
  @IsString()
  @IsNotEmpty()
  address_ar: string;
}
