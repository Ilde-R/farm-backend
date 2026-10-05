import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsOptional } from 'class-validator';

export class TankMovementsQueryDto {
  @ApiProperty({
    description: 'Inicio opcional del intervalo, incluido (ISO 8601)',
    type: Date,
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiProperty({
    description: 'Fin opcional del intervalo, excluido (ISO 8601)',
    type: Date,
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
