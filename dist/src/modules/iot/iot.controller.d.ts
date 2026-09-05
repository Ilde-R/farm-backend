import { IotService } from './iot.service';
import { ProvisionDto } from './dto/provision.dto';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
export declare class IotController {
    private readonly iotService;
    constructor(iotService: IotService);
    provision(dto: ProvisionDto, req: RequestWithUser): Promise<{
        deviceKey: string;
        blowerConfigId: string;
        blowerId: string;
        tenantId: string;
        currentThreshold: number;
    }>;
    listDevices(req: RequestWithUser): Promise<({
        blowerConfig: {
            name: string | null;
            blowerId: string;
            firmwareVersion: string | null;
            wifiRssi: number | null;
            uptimeMs: bigint | null;
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
    revokeDevice(key: string, req: RequestWithUser): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        blowerConfigId: string;
        key: string;
    }>;
}
