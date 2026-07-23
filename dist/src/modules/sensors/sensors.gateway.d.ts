import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { SensorsService } from './sensors.service';
import { Server } from 'ws';
import WebSocket from 'ws';
export declare class SensorsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly sensorsService;
    private readonly logger;
    server: Server;
    private connectedClients;
    constructor(sensorsService: SensorsService);
    handleConnection(client: WebSocket): void;
    handleDisconnect(client: WebSocket): void;
    handleRegisterBlower(data: {
        tenantId: string;
        blowerId: string;
    }, client: WebSocket): Promise<{
        status: string;
        message: string;
    } | undefined>;
    handlePressureReading(data: {
        psi?: number;
        blowerId?: string;
        blowerConfigId?: string;
        tenantId?: string;
    }, client: WebSocket): Promise<{
        id: bigint;
        createdAt: Date;
        tenantId: string;
        blowerConfigId: string | null;
        psi: number;
        isAlert: boolean;
    } | null | undefined>;
    handleSetNewThreshold(data: {
        blowerId?: string;
        threshold: number;
    }, client: WebSocket): Promise<{
        status: string;
        message: string;
        threshold?: undefined;
        blowerId?: undefined;
    } | {
        status: string;
        threshold: number;
        blowerId: string;
        message?: undefined;
    }>;
    handleGetThreshold(data: {
        blowerId?: string;
    }, client: WebSocket): Promise<{
        status: string;
        message: string;
    } | undefined>;
    handleCurrentThreshold(data: {
        threshold: number;
        blowerId?: string;
    }): void;
}
