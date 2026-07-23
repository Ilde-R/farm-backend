import { PrismaService } from '../../prisma/prisma.service';
import { ProvisionDto } from './dto/provision.dto';
export declare class IotService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    provision(dto: ProvisionDto): Promise<{
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
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        blowerConfigId: string;
        key: string;
    })[]>;
    revokeDeviceKey(key: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        blowerConfigId: string;
        key: string;
    }>;
}
