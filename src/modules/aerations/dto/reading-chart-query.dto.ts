import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum ReadingPeriod {
    TODAY = 'today',
    MONTH = 'month',
    YEAR = 'year',
    ALL = 'all',
}

export class ReadingChartQueryDto {
    @ApiPropertyOptional({
        enum: ReadingPeriod,
        default: ReadingPeriod.TODAY,
        example: ReadingPeriod.TODAY,
    })
    @IsOptional()
    @IsEnum(ReadingPeriod)
    period: ReadingPeriod = ReadingPeriod.TODAY;

    @ApiPropertyOptional({
        description: 'Filtrar por un dispositivo específico (blowerId)',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsOptional()
    @IsUUID()
    blowerConfigId?: string;
}