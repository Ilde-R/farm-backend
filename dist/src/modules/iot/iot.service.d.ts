import { PrismaService } from '../../prisma/prisma.service';
import { ProvisionDto } from './dto/provision.dto';
import { UpdateBlowerConfigDto } from './dto/update-blower-config.dto';
import { IotRepository } from './repositories/iot.repository';
import { DeviceConnectionRegistry } from '../../common/device-connection.registry';
export declare class IotService {
    private readonly prisma;
    private readonly iotRepository;
    private readonly connectionRegistry;
    constructor(prisma: PrismaService, iotRepository: IotRepository, connectionRegistry: DeviceConnectionRegistry);
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
    listDeviceKeys(tenantId: string): Promise<{
        blowerConfigId: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        key: string;
    }[]>;
    revokeDeviceKey(key: string, tenantId: string): Promise<{
        blowerConfigId: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        key: string;
    }>;
    updateBlowerConfig(tenantId: string, blowerId: string, dto: UpdateBlowerConfigDto): Promise<{
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
    deleteBlower(tenantId: string, blowerId: string): Promise<{
        message: string;
    }>;
}
