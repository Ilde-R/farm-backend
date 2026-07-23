import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { IncomingMessage } from 'http';
import { IotService } from '../../iot/iot.service';

export interface WsClientData {
  user?: { sub: string; email: string; tenantId: string };
  device?: {
    blowerConfigId: string;
    blowerId: string;
    tenantId: string;
    currentThreshold: number;
  };
}

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly iotService: IotService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Record<string, unknown> = context.switchToWs().getClient();

    const req: IncomingMessage = ((client as any).__upgradeReq || client.upgradeReq) as IncomingMessage;

    this.logger.log(`WS Guard: upgradeReq=${!!req}, url=${req?.url || 'none'}`);

    if (!req) {
      throw new WsException('No upgrade request available');
    }

    const url = new URL(
      req.url || '/',
      `http://${req.headers.host || 'localhost'}`,
    );
    const token = url.searchParams.get('token');
    const deviceKey = (url.searchParams.get('key') ||
      req.headers['key']) as string;

    if (!token && !deviceKey) {
      throw new WsException('Token o device key no proporcionado');
    }

    if (deviceKey) {
      this.logger.log(`WS Guard: validating device key`);
      const device = await this.iotService.validateDeviceKey(deviceKey);
      if (!device) {
        this.logger.warn(`WS Guard: invalid device key`);
        throw new WsException('Device key inválido o inactivo');
      }

      this.logger.log(`WS Guard: device OK blowerId=${device.blowerId}`);
      client.device = device;
      return true;
    }

    if (token) {
      this.logger.log(`WS Guard: validating JWT token`);
      try {
        const payload = await this.jwtService.verifyAsync<{
          sub: string;
          email: string;
          tenantId: string;
        }>(token);

        client.user = payload;
        this.logger.log(`WS Guard: JWT OK tenantId=${payload.tenantId}`);
        return true;
      } catch {
        throw new WsException('Token inválido o expirado');
      }
    }

    return false;
  }
}
