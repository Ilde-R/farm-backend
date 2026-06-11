import { SensorsService } from './sensors.service';
import { Server } from 'ws';
export declare class SensorsGateway {
    private readonly sensorsService;
    server: Server;
    constructor(sensorsService: SensorsService);
    create(data: any): Promise<any>;
    handleSetNewThreshold(data: {
        threshold: number;
    }): {
        status: string;
        threshold: number;
    };
    handleGetThreshold(data: any): Promise<void>;
    handleCurrentThreshold(data: any): void;
}
