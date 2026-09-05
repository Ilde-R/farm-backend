import { IotService } from './iot.service';
import { ProvisionDto } from './dto/provision.dto';
import { UpdateBlowerConfigDto } from './dto/update-blower-config.dto';
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
    listDevices(req: RequestWithUser): Promise<{
        blowerConfigId: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        key: string;
    }[]>;
    revokeDevice(key: string, req: RequestWithUser): Promise<{
        blowerConfigId: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        key: string;
    }>;
    updateBlowerConfig(blowerId: string, dto: UpdateBlowerConfigDto, req: RequestWithUser): Promise<{
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
    deleteBlower(blowerId: string, req: RequestWithUser): Promise<{
        message: string;
    }>;
}
