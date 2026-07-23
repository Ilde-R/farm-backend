import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class ProvisionDto {
  @ApiProperty({ description: 'Identificador del blower dentro del tenant' })
  @IsNotEmpty()
  @IsString()
  blowerId!: string;

  @ApiProperty({
    description: 'Nombre descriptivo del blower',
    required: false,
  })
  @IsOptional()
  @IsString()
  blowerName?: string;
}
