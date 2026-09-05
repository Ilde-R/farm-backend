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
            blowerId: string;
            name: string | null;
            firmwareVersion: string | null;
            wifiRssi: number | null;
            uptimeMs: number | null;
            freeHeap: number | null;
            readIntervalMs: number | null;
            scaleFactor: number | null;
            saveIntervalSeconds: number;
        };
    } & {
        blowerConfigId: string;
        key: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
    })[]>;
    revokeDevice(key: string, req: RequestWithUser): Promise<{
        blowerConfigId: string;
        key: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
    }>;
    updateBlowerConfig(blowerId: string, dto: UpdateBlowerConfigDto, req: RequestWithUser): Promise<{
        blowerId: string;
        tenantId: string;
        id: string;
        name: string | null;
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
