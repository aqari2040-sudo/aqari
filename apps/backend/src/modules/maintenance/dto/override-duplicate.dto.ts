import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OverrideDuplicateDto {
  @ApiProperty({
    description: 'Justification for overriding the duplicate detection',
    minLength: 10,
    example: 'Previous request was closed without resolution. Issue has recurred.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  justification: string;
}
