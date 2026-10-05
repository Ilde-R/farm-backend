import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType } from '@prisma/client';
import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStockOutflowDto {
  @ApiProperty({ description: 'Lote del que se registrará la salida' })
  @IsUUID()
  batchId!: string;

  @ApiProperty({
    enum: [MovementType.mortality, MovementType.sale],
    description: 'Motivo de la salida: mortalidad o venta',
  })
  @IsIn([MovementType.mortality, MovementType.sale])
  movementType!: 'mortality' | 'sale';

  @ApiProperty({ description: 'Cantidad que se restará al lote', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ description: 'Fecha efectiva del registro', type: Date })
  @Type(() => Date)
  @IsDate()
  movementDate!: Date;

  @ApiPropertyOptional({ description: 'Observaciones', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
