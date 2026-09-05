import { PrismaService } from '../../prisma/prisma.service';
import { ProvisionDto } from './dto/provision.dto';
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
            blowerId: string;
            name: string | null;
            firmwareVersion: string | null;
            wifiRssi: number | null;
            uptimeMs: bigint | null;
            freeHeap: number | null;
            readIntervalMs: number | null;
            scaleFactor: number | null;
        };
    } & {
        blowerConfigId: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        key: string;
    })[]>;
    revokeDeviceKey(key: string, tenantId: string): Promise<{
        blowerConfigId: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        key: string;
    }>;
}
