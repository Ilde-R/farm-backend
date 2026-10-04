import {
  IsInt,
  IsNumber,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBlowerConfigDto {
  @ApiPropertyOptional({
    example: 2.5,
    description: 'Umbral de presión del blower (no puede ser negativo)',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  currentThreshold?: number;

  @ApiPropertyOptional({
    example: 300,
    description: 'Segundos entre guardados a BD (60-10800)',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(60)
  @Max(10800)
  saveIntervalSeconds?: number;

  @ApiPropertyOptional({
    example: 0.8095,
    description: 'Factor de escala del sensor (0.05-10.0)',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.05)
  @Max(10)
  scaleFactor?: number;
}
