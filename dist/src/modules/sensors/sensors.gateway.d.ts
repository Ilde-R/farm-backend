import { SensorsService } from './sensors.service';
import { Server } from 'ws';
import WebSocket from 'ws';
export declare class SensorsGateway {
    private readonly sensorsService;
    private readonly logger;
    server: Server;
    constructor(sensorsService: SensorsService);
    handleRegisterBlower(data: {
        tenantId: string;
        blowerId: string;
    }, client: WebSocket): Promise<void>;
    create(data: any): Promise<{
        id: bigint;
        psi: number;
        isAlert: boolean;
        createdAt: Date;
        tenantId: string;
        blowerConfigId: string | null;
    } | null | undefined>;
    handleSetNewThreshold(data: {
        threshold: number;
    }): {
        status: string;
        threshold: number;
    };
    handleGetThreshold(data: any): Promise<void>;
    handleCurrentThreshold(data: any): void;
}
