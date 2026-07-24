import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { SensorsService } from './sensors.service';
import { Server } from 'ws';
import WebSocket from 'ws';
import { IotService } from '../iot/iot.service';
import { JwtService } from '@nestjs/jwt';
export declare class SensorsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly sensorsService;
    private readonly iotService;
    private readonly jwtService;
    private readonly logger;
    server: Server;
    private connectedClients;
    private heartbeatTimers;
    private ensureClientInfo;
    constructor(sensorsService: SensorsService, iotService: IotService, jwtService: JwtService);
    private broadcastToUsers;
    private getOnlineDevices;
    afterInit(server: Server): void;
    private startHeartbeat;
    private clearHeartbeat;
    handleConnection(client: WebSocket): Promise<void>;
    handleDisconnect(client: WebSocket): void;
    private isDeviceActive;
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
        ok: boolean;
    } | undefined>;
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
    } | undefined>;
    handleGetThreshold(data: {
        blowerId?: string;
    }, client: WebSocket): Promise<{
        status: string;
        message: string;
    } | undefined>;
    handleCurrentThreshold(data: {
        threshold: number;
        blowerId?: string;
    }, sender: WebSocket): void;
    handleDeviceInfo(data: {
        firmware?: string;
        rssi?: number;
        uptime?: number;
        heap?: number;
    }, client: WebSocket): Promise<void>;
    handleSetDeviceConfig(data: {
        blowerId?: string;
        readIntervalMs?: number;
        scaleFactor?: number;
    }, client: WebSocket): Promise<{
        status: string;
        message: string;
    } | {
        readIntervalMs?: number;
        scaleFactor?: number;
        status: string;
        blowerId: string;
        message?: undefined;
    } | undefined>;
}
