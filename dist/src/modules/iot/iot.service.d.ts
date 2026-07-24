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
            uptimeMs: number | null;
            freeHeap: number | null;
            readIntervalMs: number | null;
            scaleFactor: number | null;
        };
    } & {
        id: string;
        key: string;
        isActive: boolean;
        createdAt: Date;
        blowerConfigId: string;
    })[]>;
    revokeDeviceKey(key: string, tenantId: string): Promise<{
        id: string;
        key: string;
        isActive: boolean;
        createdAt: Date;
        blowerConfigId: string;
    }>;
}
