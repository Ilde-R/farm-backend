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
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        blowerConfigId: string;
        key: string;
    })[]>;
    revokeDevice(key: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        blowerConfigId: string;
        key: string;
    }>;
}
