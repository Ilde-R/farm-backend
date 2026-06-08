// import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, ValidateIf } from 'class-validator';

export class LoginDto {
  // @ApiProperty()
  @IsString()
  username!: string;

  // @ApiPropertyOptional()
  @IsEmail()
  email!: string;

  // @ApiProperty()
  @IsString()
  password!: string;
}
