import { BaseRepository } from '../../../common/abstracts/base.repository';
import { CreateSensorDto } from '../dto/create-sensor.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { PressureReading } from '@prisma/client';
export declare class SensorsRepository extends BaseRepository<PressureReading, CreateSensorDto, Partial<PressureReading>> {
    private readonly prisma;
    constructor(prisma: PrismaService);
    upsertBlowerConfig(tenantId: string, blowerId: string, currentThreshold?: number): Promise<{
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
    updateBlowerThreshold(blowerConfigId: string, threshold: number): Promise<{
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
    getBlowerConfig(tenantId: string, blowerId: string): Promise<{
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
    getFirstBlowerConfig(tenantId: string): Promise<{
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
    getAllBlowerConfigs(tenantId: string): Promise<{
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
    createReading(data: {
        tenant: {
            connect: {
                id: string;
            };
        };
        blowerConfig: {
            connect: {
                id: string;
            };
        };
        psi: number;
        isAlert: boolean;
        deviceTs?: number;
        deviceTime?: Date;
        source?: string;
    }): Promise<{
        psi: number;
        tenantId: string;
        blowerConfigId: string | null;
        isAlert: boolean;
        id: bigint;
        createdAt: Date;
    }>;
    getAlertState(blowerConfigId: string): Promise<{
        lastSaveAt: number;
        lastAlertState: boolean;
    }>;
    updateAlertState(blowerConfigId: string, lastSaveAt: Date, lastAlertState: boolean): Promise<{
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
    createManyReadings(data: {
        tenantId: string;
        blowerConfigId: string;
        psi: number;
        isAlert: boolean;
        deviceTs?: number;
        deviceTime?: Date;
        source?: string;
    }[]): Promise<import("@prisma/client").Prisma.BatchPayload | undefined>;
}
