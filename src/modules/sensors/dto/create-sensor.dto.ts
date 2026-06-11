import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSensorDto {
  @IsOptional()
  @IsString()
  blowerId?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  blowerConfigId?: string;

  @IsOptional()
  isAlert?: boolean;

  @IsNotEmpty({ message: 'La lectura de PSI es obligatoria' })
  @IsNumber({}, { message: 'El valor de PSI debe ser un número válido' })
  @Min(0, { message: 'La presión (PSI) no puede ser un número negativo' })
  psi!: number;

  @IsOptional()
  @IsNumber({}, { message: 'El umbral debe ser un número' })
  @Min(0, { message: 'El umbral no puede ser un número negativo' })
  currentThreshold?: number;
}
