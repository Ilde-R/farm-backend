import { IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBlowerConfigDto {
  @ApiPropertyOptional({
    example: 300,
    description: 'Segundos entre guardados a BD (60-10800)',
  })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(10800)
  saveIntervalSeconds?: number;

  @ApiPropertyOptional({
    example: 0.8095,
    description: 'Factor de escala del sensor',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.0000)
  scaleFactor?: number;
}
