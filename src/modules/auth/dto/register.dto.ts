import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  IsUUID,
  IsStrongPassword,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'juanperez', description: 'Nombre de usuario' })
  @IsString()
  username!: string;

  @ApiProperty({ example: 'juan@granja.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123!', minLength: 8 })
  @IsString()
  @IsStrongPassword()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;

  @ApiPropertyOptional({
    description: 'ID de la granja a la que pertenece el usuario',
  })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
