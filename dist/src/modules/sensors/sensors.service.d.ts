import { OnModuleDestroy } from '@nestjs/common';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { BaseService } from '../../common/abstracts/base.service';
import { SensorsRepository } from './repositories/sensors.repository';
import { PressureReading } from '@prisma/client';
export declare class SensorsService extends BaseService<PressureReading, CreateSensorDto, Partial<PressureReading>> implements OnModuleDestroy {
    private readonly sensorsRepository;
    private readonly logger;
    private alertCache;
    private readingBuffer;
    private flushTimer;
    constructor(sensorsRepository: SensorsRepository);
    onModuleDestroy(): void;
    registerBlower(tenantId: string, blowerId: string): Promise<{
        id: string;
        name: string | null;
        tenantId: string;
        blowerId: string;
        currentThreshold: number;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: number | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
        lastSaveAt: Date | null;
        lastAlertState: boolean;
    }>;
    private getCachedAlertState;
    private updateCachedAlertState;
    createReading(data: CreateSensorDto): Promise<{
        psi: number;
        isAlert: boolean;
    } | null>;
    private flushReadingBuffer;
    getLatestThreshold(tenantId: string, blowerId?: string): Promise<number>;
    updateThreshold(tenantId: string, blowerId: string, threshold: number): Promise<{
        id: string;
        name: string | null;
        tenantId: string;
        blowerId: string;
        currentThreshold: number;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: number | null;
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
        uptimeMs?: number;
        freeHeap?: number;
    }): Promise<{
        id: string;
        name: string | null;
        tenantId: string;
        blowerId: string;
        currentThreshold: number;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: number | null;
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
        id: string;
        name: string | null;
        tenantId: string;
        blowerId: string;
        currentThreshold: number;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: number | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
        lastSaveAt: Date | null;
        lastAlertState: boolean;
    }>;
    getBlowerConfigByTenantAndId(tenantId: string, blowerId: string): Promise<{
        id: string;
        name: string | null;
        tenantId: string;
        blowerId: string;
        currentThreshold: number;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: number | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
        lastSaveAt: Date | null;
        lastAlertState: boolean;
    } | null>;
    getBlowerConfigById(blowerConfigId: string): Promise<{
        id: string;
        name: string | null;
        tenantId: string;
        blowerId: string;
        currentThreshold: number;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: number | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
        lastSaveAt: Date | null;
        lastAlertState: boolean;
    } | null>;
}
