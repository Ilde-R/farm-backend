import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateTransferDto {
  @ApiProperty({
    description: 'Lote que se transferirá desde su tanque actual',
  })
  @IsUUID()
  batchId!: string;

  @ApiProperty({ description: 'Tanque que recibirá el lote transferido' })
  @IsUUID()
  destinationTankId!: string;

  @ApiProperty({
    description: 'Cantidad de organismos que se transferirán',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({
    description: 'Fecha efectiva de la transferencia',
    type: Date,
  })
  @Type(() => Date)
  @IsDate()
  movementDate!: Date;

  @ApiPropertyOptional({
    description: 'Observaciones de la transferencia',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
