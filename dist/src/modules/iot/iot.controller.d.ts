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
    listDevices(req: RequestWithUser): Promise<({
        blowerConfig: {
            name: string | null;
            blowerId: string;
            firmwareVersion: string | null;
            wifiRssi: number | null;
            uptimeMs: number | null;
            freeHeap: number | null;
            readIntervalMs: number | null;
            scaleFactor: number | null;
            saveIntervalSeconds: number;
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
    updateBlowerConfig(blowerId: string, dto: UpdateBlowerConfigDto, req: RequestWithUser): Promise<{
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
    deleteBlower(blowerId: string, req: RequestWithUser): Promise<{
        message: string;
    }>;
}
