import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDate, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateBatchDto {
  @ApiProperty({ description: 'Identificador del tanque al que se asigna el lote' })
  @IsUUID()
  tankId!: string;

  @ApiProperty({ description: 'Cantidad inicial del lote', minimum: 1 })
  @IsInt()
  @Min(1)
  initialQuantity!: number;

  @ApiPropertyOptional({
    description: 'Fecha en que se sembró o ingresó el lote al tanque',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  stockingDate?: Date;
}
