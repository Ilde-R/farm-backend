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
        blowerConfigId: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        key: string;
    })[]>;
    revokeDevice(key: string, req: RequestWithUser): Promise<{
        blowerConfigId: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        key: string;
    }>;
}
