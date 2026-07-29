import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBlowerConfigDto {
  @ApiProperty({
    example: 300,
    description: 'Segundos entre guardados a BD (60-10800)',
  })
  @IsNumber()
  @Min(60)
  @Max(10800)
  saveIntervalSeconds!: number;
}
