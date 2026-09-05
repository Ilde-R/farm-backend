import { CreateSensorDto } from './dto/create-sensor.dto';
import { BaseService } from '../../common/abstracts/base.service';
import { SensorsRepository } from './repositories/sensors.repository';
import { PressureReading } from '@prisma/client';
import { ReadingChartQueryDto } from './dto/reading-chart-query.dto';
export declare class SensorsService extends BaseService<PressureReading, CreateSensorDto, Partial<PressureReading>> {
    private readonly sensorsRepository;
    private readonly logger;
    constructor(sensorsRepository: SensorsRepository);
    registerBlower(tenantId: string, blowerId: string): Promise<{
        blowerId: string;
        tenantId: string;
        currentThreshold: number;
        name: string | null;
        id: string;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: bigint | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
        lastSaveAt: Date | null;
        lastAlertState: boolean;
    }>;
    createReading(data: CreateSensorDto): Promise<{
        psi: number;
        tenantId: string;
        blowerConfigId: string | null;
        isAlert: boolean;
        id: bigint;
        createdAt: Date;
    } | null>;
    getLatestThreshold(tenantId: string, blowerId?: string): Promise<number>;
    updateThreshold(tenantId: string, blowerId: string, threshold: number): Promise<{
        blowerId: string;
        tenantId: string;
        currentThreshold: number;
        name: string | null;
        id: string;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: bigint | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
        lastSaveAt: Date | null;
        lastAlertState: boolean;
    } | null>;
    getAllThresholds(tenantId: string): Promise<{
        blowerId: string;
        threshold: number;
    }[]>;
    updateDeviceMetadata(blowerConfigId: string, data: {
        firmwareVersion?: string;
        wifiRssi?: number;
        uptimeMs?: bigint;
        freeHeap?: number;
    }): Promise<{
        blowerId: string;
        tenantId: string;
        currentThreshold: number;
        name: string | null;
        id: string;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: bigint | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
        lastSaveAt: Date | null;
        lastAlertState: boolean;
    }>;
    updateDeviceConfig(blowerConfigId: string, data: {
        readIntervalMs?: number;
        scaleFactor?: number;
    }): Promise<{
        blowerId: string;
        tenantId: string;
        currentThreshold: number;
        name: string | null;
        id: string;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: bigint | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
        lastSaveAt: Date | null;
        lastAlertState: boolean;
    }>;
    getBlowerConfigByTenantAndId(tenantId: string, blowerId: string): Promise<{
        blowerId: string;
        tenantId: string;
        currentThreshold: number;
        name: string | null;
        id: string;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: bigint | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
        lastSaveAt: Date | null;
        lastAlertState: boolean;
    } | null>;
    getBlowerConfigById(blowerConfigId: string): Promise<{
        blowerId: string;
        tenantId: string;
        currentThreshold: number;
        name: string | null;
        id: string;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: bigint | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
        lastSaveAt: Date | null;
        lastAlertState: boolean;
    } | null>;
    getReadingsForChart(tenantId: string, query: ReadingChartQueryDto): Promise<{
        date: Date;
        psi: number;
        isAlert: boolean;
        blowerId: string | undefined;
        blowerName: string | null | undefined;
    }[]>;
    private getReadingDateRange;
}
