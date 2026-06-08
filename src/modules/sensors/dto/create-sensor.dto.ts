import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSensorDto {
  @IsOptional()
  @IsString({ message: 'El identificador del soplador debe ser texto' })
  blowerId?: string;

  @IsNotEmpty({ message: 'La lectura de PSI es obligatoria' })
  @IsNumber({}, { message: 'El valor de PSI debe ser un número válido' })
  psi!: number;
}
