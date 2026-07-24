import { CreateSensorDto } from './dto/create-sensor.dto';
import { BaseService } from '../../common/abstracts/base.service';
import { SensorsRepository } from './repositories/sensors.repository';
export declare class SensorsService extends BaseService<any, CreateSensorDto, any> {
    private readonly sensorsRepository;
    private readonly logger;
    constructor(sensorsRepository: SensorsRepository);
    registerBlower(tenantId: string, blowerId: string): Promise<{
        name: string | null;
        id: string;
        tenantId: string;
        blowerId: string;
        currentThreshold: number;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: number | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
    }>;
    private lastSaveTime;
    private lastAlertState;
    create(data: CreateSensorDto): Promise<{
        id: bigint;
        tenantId: string;
        createdAt: Date;
        psi: number;
        isAlert: boolean;
        blowerConfigId: string | null;
    } | null>;
    getLatestThreshold(tenantId: string, blowerId?: string): Promise<number>;
    updateThreshold(tenantId: string, blowerId: string, threshold: number): Promise<{
        name: string | null;
        id: string;
        tenantId: string;
        blowerId: string;
        currentThreshold: number;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: number | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
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
        name: string | null;
        id: string;
        tenantId: string;
        blowerId: string;
        currentThreshold: number;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: number | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
    }>;
    updateDeviceConfig(blowerConfigId: string, data: {
        readIntervalMs?: number;
        scaleFactor?: number;
    }): Promise<{
        name: string | null;
        id: string;
        tenantId: string;
        blowerId: string;
        currentThreshold: number;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: number | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
    }>;
    getBlowerConfigByTenantAndId(tenantId: string, blowerId: string): Promise<{
        name: string | null;
        id: string;
        tenantId: string;
        blowerId: string;
        currentThreshold: number;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: number | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
    } | null>;
    getBlowerConfigById(blowerConfigId: string): Promise<{
        name: string | null;
        id: string;
        tenantId: string;
        blowerId: string;
        currentThreshold: number;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: number | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
    } | null>;
}
