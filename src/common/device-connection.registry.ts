import { Injectable, Logger } from '@nestjs/common';
import WebSocket from 'ws';

export interface EnrichedClient {
  tenantId: string;
  blowerId?: string;
  blowerConfigId?: string;
}

export interface UserAuth {
  tenantId: string;
  sub: string;
}

@Injectable()
export class DeviceConnectionRegistry {
  private readonly logger = new Logger(DeviceConnectionRegistry.name);

  readonly clients = new Map<WebSocket, EnrichedClient>();

  register(client: WebSocket, info: EnrichedClient) {
    this.clients.set(client, info);
  }

  unregister(client: WebSocket) {
    this.clients.delete(client);
  }

  hasConnectionForBlowerConfig(
    blowerConfigId: string,
    exclude?: WebSocket,
  ) {
    for (const [client, info] of this.clients) {
      if (
        client !== exclude &&
        info.blowerConfigId === blowerConfigId &&
        client.readyState === WebSocket.OPEN
      ) {
        return true;
      }
    }

    return false;
  }

  closeByBlowerId(blowerId: string, reason: string) {
    for (const [client, info] of this.clients) {
      if (info.blowerId === blowerId) {
        try {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({ event: 'auth_error', data: { reason } }),
            );
          }
        } catch (e) {
          this.logger.warn(`Failed to send auth_error: ${e}`);
        }
        client.close(4001, reason);
        this.logger.log(`Socket cerrado para blower ${blowerId} (${reason})`);
      }
    }
  }

  broadcastToUsers(
    tenantId: string,
    message: { event: string; data: any },
    exclude?: WebSocket,
  ) {
    for (const [c, info] of this.clients) {
      const userData = (c as unknown as { user?: UserAuth }).user;
      if (
        c !== exclude &&
        c.readyState === WebSocket.OPEN &&
        userData &&
        userData.tenantId === tenantId
      ) {
        c.send(JSON.stringify(message));
      }
    }
  }

  sendToDevice(blowerId: string, message: { event: string; data: any }) {
    for (const [c, info] of this.clients) {
      if (info.blowerId === blowerId && c.readyState === WebSocket.OPEN) {
        try {
          c.send(JSON.stringify(message));
          this.logger.log(
            `Configuración enviada al device ${blowerId} (${message.event})`,
          );
          return true;
        } catch (e) {
          this.logger.warn(`Failed to send to device ${blowerId}: ${e}`);
          return false;
        }
      }
    }
    this.logger.warn(
      `Device ${blowerId} no conectado; config se aplicará en la próxima conexión`,
    );
    return false;
  }

  getOnlineDevices(tenantId: string) {
    const seen = new Set<string>();
    const devices: { blowerId: string; blowerConfigId: string }[] = [];
    for (const [, info] of this.clients) {
      if (
        info.blowerId &&
        info.tenantId === tenantId &&
        !seen.has(info.blowerId)
      ) {
        seen.add(info.blowerId);
        devices.push({
          blowerId: info.blowerId,
          blowerConfigId: info.blowerConfigId!,
        });
      }
    }
    return devices;
  }
}
