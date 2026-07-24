import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IotService } from '../../iot/iot.service';
export interface WsClientData {
    user?: {
        sub: string;
        email: string;
        tenantId: string;
    };
    device?: {
        blowerConfigId: string;
        blowerId: string;
        tenantId: string;
        currentThreshold: number;
        deviceKey: string;
    };
}
export declare class WsAuthGuard implements CanActivate {
    private readonly jwtService;
    private readonly iotService;
    private readonly logger;
    constructor(jwtService: JwtService, iotService: IotService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
