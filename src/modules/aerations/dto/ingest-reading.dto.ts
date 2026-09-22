import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class IngestReadingDto {
  @IsNumber()
  psi!: number;

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
  @IsBoolean()
  isAlert?: boolean;

  @IsOptional()
  @IsNumber()
  currentThreshold?: number;

  @IsOptional()
  @IsNumber()
  deviceTs?: number;

  @IsOptional()
  deviceTime?: Date;

  @IsOptional()
  @IsString()
  source?: string;
}
