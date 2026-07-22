import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, ValidateIf } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'juanperez', description: 'Nombre de usuario' })
  @IsString()
  username!: string;

  @ApiProperty({ example: 'juan@granja.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123!', minLength: 8 })
  @IsString()
  password!: string;
}
