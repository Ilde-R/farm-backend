import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class ProvisionDto {
  @ApiProperty({ description: 'Blower identifier within the tenant' })
  @IsNotEmpty()
  @IsString()
  blowerId!: string;

  @ApiProperty({
    description: 'Human-readable name for the blower',
    required: false,
  })
  @IsOptional()
  @IsString()
  blowerName?: string;
}
