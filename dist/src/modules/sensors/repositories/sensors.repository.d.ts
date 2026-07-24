import { BaseRepository } from '../../../common/abstracts/base.repository';
import { CreateSensorDto } from '../dto/create-sensor.dto';
import { PrismaService } from '../../../prisma/prisma.service';
export declare class SensorsRepository extends BaseRepository<any, CreateSensorDto, any> {
    private readonly prisma;
    constructor(prisma: PrismaService);
    upsertBlowerConfig(tenantId: string, blowerId: string, currentThreshold?: number): Promise<{
        blowerId: string;
        tenantId: string;
        currentThreshold: number;
        id: string;
        name: string | null;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: number | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
    }>;
    updateBlowerThreshold(blowerConfigId: string, threshold: number): Promise<{
        blowerId: string;
        tenantId: string;
        currentThreshold: number;
        id: string;
        name: string | null;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: number | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
    }>;
    getBlowerConfig(tenantId: string, blowerId: string): Promise<{
        blowerId: string;
        tenantId: string;
        currentThreshold: number;
        id: string;
        name: string | null;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: number | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
    } | null>;
    getFirstBlowerConfig(tenantId: string): Promise<{
        blowerId: string;
        tenantId: string;
        currentThreshold: number;
        id: string;
        name: string | null;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: number | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
    } | null>;
    getAllBlowerConfigs(tenantId: string): Promise<{
        blowerId: string;
        tenantId: string;
        currentThreshold: number;
        id: string;
        name: string | null;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: number | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
    }[]>;
    updateDeviceMetadata(blowerConfigId: string, data: {
        firmwareVersion?: string;
        wifiRssi?: number;
        uptimeMs?: number;
        freeHeap?: number;
    }): Promise<{
        blowerId: string;
        tenantId: string;
        currentThreshold: number;
        id: string;
        name: string | null;
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
        blowerId: string;
        tenantId: string;
        currentThreshold: number;
        id: string;
        name: string | null;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: number | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
    }>;
    getBlowerConfigById(blowerConfigId: string): Promise<{
        blowerId: string;
        tenantId: string;
        currentThreshold: number;
        id: string;
        name: string | null;
        firmwareVersion: string | null;
        wifiRssi: number | null;
        uptimeMs: number | null;
        freeHeap: number | null;
        readIntervalMs: number | null;
        scaleFactor: number | null;
    } | null>;
    createReading(data: any): Promise<{
        psi: number;
        tenantId: string;
        blowerConfigId: string | null;
        isAlert: boolean;
        id: bigint;
        createdAt: Date;
    }>;
}
