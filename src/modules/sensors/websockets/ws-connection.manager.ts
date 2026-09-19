import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'ws';
import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { JwtService } from '@nestjs/jwt';
import { IotService } from '../../iot/iot.service';
import { DeviceTimeService } from '../services/device-time.service';
import { DeviceConnectionRegistry, EnrichedClient, UserAuth } from '../../../common/device-connection.registry';
import { SensorsService } from '../sensors.service';

interface DeviceAuth {
  tenantId: string;
  blowerId: string;
  blowerConfigId: string;
  currentThreshold: number;
  deviceKey: string;
}

@Injectable()
export class WsConnectionManager {
  private readonly logger = new Logger(WsConnectionManager.name);
  private heartbeatTimers = new Map<WebSocket, ReturnType<typeof setTimeout>>();
  private revalidationTimers = new Map<WebSocket, ReturnType<typeof setInterval>>();
  private readonly DEVICE_REVALIDATION_INTERVAL_MS = 5 * 60 * 1000;

  constructor(
    public readonly registry: DeviceConnectionRegistry,
    private readonly iotService: IotService,
    private readonly jwtService: JwtService,
    private readonly sensorsService: SensorsService,
    private readonly deviceTimeService: DeviceTimeService,
  ) {}

  setupUpgradeReqInjection(server: Server) {
    server.on('connection', (client: WebSocket, request: IncomingMessage) => {
      (client as any).__upgradeReq = request;
    });
  }

  getClientInfo(client: WebSocket): EnrichedClient | undefined {
    let info = this.registry.clients.get(client);
    if (!info) {
      const device = (client as any).device as DeviceAuth;
      if (device) return { tenantId: device.tenantId, blowerId: device.blowerId, blowerConfigId: device.blowerConfigId };
      const user = (client as any).user as UserAuth;
      if (user) return { tenantId: user.tenantId };
    }
    return info;
  }

  async handleClientConnection(client: WebSocket) {
    const req = (client as any).__upgradeReq as IncomingMessage;
    if (req) {
      try {
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const token = url.searchParams.get('token');
        const deviceKey = (url.searchParams.get('key') || req.headers['key']) as string;

        if (deviceKey) {
          const device = await this.iotService.validateDeviceKey(deviceKey);
          if (device) {
            (client as any).device = { ...device, deviceKey };
          } else {
            client.close(4001, 'Device key revoked');
            return;
          }
        } else if (token) {
          try {
            const payload = await this.jwtService.verifyAsync(token);
            (client as any).user = payload;
          } catch {
            client.close(4001, 'Invalid token');
            return;
          }
        }
      } catch (e) {
        client.close(4001, 'Connection failed');
        return;
      }
    }

    const info = this.getClientInfo(client);
    if (info) this.registry.register(client, info);

    client.on('pong', () => this.startHeartbeat(client));
    this.startHeartbeat(client);
    this.startDeviceRevalidation(client);

    const device = (client as any).device;
    if (device && info?.blowerConfigId) {
      this.registry.broadcastToUsers(info.tenantId, { event: 'device_online', data: { blowerId: info.blowerId, blowerConfigId: info.blowerConfigId } });
      const config = await this.sensorsService.getBlowerConfigById(info.blowerConfigId);
      if (config?.scaleFactor) client.send(JSON.stringify({ event: 'device_config_update', data: { blowerId: info.blowerId, scaleFactor: config.scaleFactor } }));
    }
  }

  handleClientDisconnect(client: WebSocket) {
    clearTimeout(this.heartbeatTimers.get(client));
    clearInterval(this.revalidationTimers.get(client));
    const info = this.registry.clients.get(client);

    if (info?.blowerConfigId && !this.registry.hasConnectionForBlowerConfig(info.blowerConfigId, client)) {
      this.deviceTimeService.clearDeviceInfo(info.blowerConfigId);
    }
    if (info?.blowerId) {
      this.registry.broadcastToUsers(info.tenantId, { event: 'device_offline', data: { blowerId: info.blowerId } }, client);
    }
    this.registry.unregister(client);
  }

  private startHeartbeat(client: WebSocket) {
    clearTimeout(this.heartbeatTimers.get(client));
    this.heartbeatTimers.set(client, setTimeout(() => client.terminate(), 35000));
    if (client.readyState === WebSocket.OPEN) client.ping();
  }

  private startDeviceRevalidation(client: WebSocket) {
    const deviceKey = (client as any).device?.deviceKey;
    if (!deviceKey) return;

    this.revalidationTimers.set(client, setInterval(async () => {
      const valid = await this.iotService.validateDeviceKey(deviceKey);
      if (!valid) {
        client.send(JSON.stringify({ event: 'auth_error', data: { reason: 'key_revoked' } }));
        client.close(4001, 'Device key revoked');
        clearInterval(this.revalidationTimers.get(client));
      }
    }, this.DEVICE_REVALIDATION_INTERVAL_MS));
  }
}