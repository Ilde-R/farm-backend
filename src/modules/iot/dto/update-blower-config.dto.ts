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
    example: 250000.0,
    description: 'Factor de escala del sensor (debe ser > 0)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  scaleFactor?: number;
}
