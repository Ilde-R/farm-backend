import { SensorsService } from './sensors.service';
export declare class SensorsController {
    private readonly sensorsService;
    constructor(sensorsService: SensorsService);
    registerBlower(body: {
        tenantId: string;
        blowerId: string;
    }): Promise<{
        blowerConfigId: string;
        blowerId: string;
        currentThreshold: number;
    }>;
}
