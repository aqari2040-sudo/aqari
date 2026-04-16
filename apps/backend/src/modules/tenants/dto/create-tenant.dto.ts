import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ID_TYPE, IdType } from '@aqari/shared';

export class CreateTenantDto {
  @ApiProperty({ example: 'Ahmed Al Mansouri' })
  @IsNotEmpty()
  @IsString()
  full_name: string;

  @ApiProperty({ example: 'أحمد المنصوري' })
  @IsNotEmpty()
  @IsString()
  full_name_ar: string;

  @ApiProperty({ enum: ID_TYPE, example: ID_TYPE.EMIRATES_ID })
  @IsNotEmpty()
  @IsEnum(ID_TYPE)
  id_type: IdType;

  @ApiProperty({ example: '784-1990-1234567-1' })
  @IsNotEmpty()
  @IsString()
  id_number: string;

  @ApiProperty({ example: '+971501234567' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+971[0-9]{8,9}$/, {
    message: 'phone must be a valid UAE number starting with +971',
  })
  phone: string;

  @ApiPropertyOptional({ example: 'ahmed@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Mohammed Al Mansouri' })
  @IsOptional()
  @IsString()
  emergency_contact_name?: string;

  @ApiPropertyOptional({ example: '+971509876543' })
  @IsOptional()
  @IsString()
  @Matches(/^\+971[0-9]{8,9}$/, {
    message: 'emergency_contact_phone must be a valid UAE number starting with +971',
  })
  emergency_contact_phone?: string;
}
