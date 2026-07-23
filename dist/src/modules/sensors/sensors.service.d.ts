import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { BaseService } from '../../common/abstracts/base.service';
import { SensorsRepository } from './repositories/sensors.repository';
export declare class SensorsService extends BaseService<any, CreateSensorDto, UpdateSensorDto> {
    private readonly sensorsRepository;
    private readonly logger;
    constructor(sensorsRepository: SensorsRepository);
    registerBlower(tenantId: string, blowerId: string): Promise<{
        id: string;
        name: string | null;
        tenantId: string;
        blowerId: string;
        currentThreshold: number;
    }>;
    private lastSaveTime;
    private lastAlertState;
    create(data: CreateSensorDto): Promise<{
        id: bigint;
        createdAt: Date;
        tenantId: string;
        blowerConfigId: string | null;
        psi: number;
        isAlert: boolean;
    } | null>;
    getLatestThreshold(tenantId: string, blowerId?: string): Promise<number>;
    updateThreshold(tenantId: string, blowerId: string, threshold: number): Promise<{
        id: string;
        name: string | null;
        tenantId: string;
        blowerId: string;
        currentThreshold: number;
    } | null>;
}
