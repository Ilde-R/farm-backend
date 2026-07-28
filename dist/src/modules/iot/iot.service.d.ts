import { PrismaService } from '../../prisma/prisma.service';
import { ProvisionDto } from './dto/provision.dto';
import { UpdateBlowerConfigDto } from './dto/update-blower-config.dto';
import { IotRepository } from './repositories/iot.repository';
export declare class IotService {
    private readonly prisma;
    private readonly iotRepository;
    constructor(prisma: PrismaService, iotRepository: IotRepository);
    provision(tenantId: string, dto: ProvisionDto): Promise<{
        deviceKey: string;
        blowerConfigId: string;
        blowerId: string;
        tenantId: string;
        currentThreshold: number;
    }>;
    validateDeviceKey(key: string): Promise<{
        blowerConfigId: string;
        blowerId: string;
        tenantId: string;
        currentThreshold: number;
    } | null>;
    listDeviceKeys(tenantId: string): Promise<({
        blowerConfig: {
            name: string | null;
            blowerId: string;
            firmwareVersion: string | null;
            wifiRssi: number | null;
            uptimeMs: number | null;
            freeHeap: number | null;
            readIntervalMs: number | null;
            scaleFactor: number | null;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        blowerConfigId: string;
        key: string;
    })[]>;
    revokeDeviceKey(key: string, tenantId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        blowerConfigId: string;
        key: string;
    }>;
    updateBlowerConfig(tenantId: string, blowerId: string, dto: UpdateBlowerConfigDto): Promise<{
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
        saveIntervalSeconds: number;
        lastSaveAt: Date | null;
        lastAlertState: boolean;
    }>;
    deleteBlower(tenantId: string, blowerId: string): Promise<{
        message: string;
    }>;
}
