import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsStrongPassword, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Password actual' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ description: 'Nueva password' })
  @IsString()
  @MinLength(8)
  @IsStrongPassword()
  newPassword!: string;
}
