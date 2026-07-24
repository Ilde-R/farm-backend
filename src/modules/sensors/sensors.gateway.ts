import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Server } from 'ws';
import WebSocket from 'ws';
import { WsAuthGuard } from '../auth/guards/ws-auth.guard';
import { IncomingMessage } from 'http';
import { IotService } from '../iot/iot.service';
import { JwtService } from '@nestjs/jwt';

interface EnrichedClient {
  tenantId: string;
  blowerId?: string;
  blowerConfigId?: string;
}

interface DeviceAuth {
  tenantId: string;
  blowerId: string;
  blowerConfigId: string;
  currentThreshold: number;
  deviceKey: string;
}

interface UserAuth {
  tenantId: string;
  sub: string;
}

function getClientInfo(client: WebSocket): EnrichedClient | undefined {
  const device = (client as unknown as { device?: DeviceAuth }).device;
  if (device) {
    return {
      tenantId: device.tenantId,
      blowerId: device.blowerId,
      blowerConfigId: device.blowerConfigId,
    };
  }
  const user = (client as unknown as { user?: UserAuth }).user;
  if (user) {
    return { tenantId: user.tenantId };
  }
  return undefined;
}

@UseGuards(WsAuthGuard)
@WebSocketGateway()
export class SensorsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(SensorsGateway.name);

  @WebSocketServer()
  server!: Server;

  private connectedClients = new Map<WebSocket, EnrichedClient>();
  private heartbeatTimers = new Map<WebSocket, ReturnType<typeof setTimeout>>();

  private ensureClientInfo(client: WebSocket): EnrichedClient | undefined {
    let info = this.connectedClients.get(client);
    if (!info) {
      info = getClientInfo(client);
      if (info) {
        this.connectedClients.set(client, info);
      }
    }
    return info;
  }

  constructor(
    private readonly sensorsService: SensorsService,
    private readonly iotService: IotService,
    private readonly jwtService: JwtService,
  ) {}

  private broadcastToUsers(tenantId: string, message: { event: string; data: any }, exclude?: WebSocket) {
    for (const [c, info] of this.connectedClients) {
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

  private getOnlineDevices(tenantId: string) {
    const seen = new Set<string>();
    const devices: { blowerId: string; blowerConfigId: string }[] = [];
    for (const [, info] of this.connectedClients) {
      if (info.blowerId && info.tenantId === tenantId && !seen.has(info.blowerId)) {
        seen.add(info.blowerId);
        devices.push({ blowerId: info.blowerId, blowerConfigId: info.blowerConfigId! });
      }
    }
    return devices;
  }

  afterInit(server: Server) {
    server.on('connection', (client: WebSocket, request: IncomingMessage) => {
      (client as any).__upgradeReq = request;
    });
  }

  private startHeartbeat(client: WebSocket) {
    this.clearHeartbeat(client);

    const timer = setTimeout(() => {
      this.logger.warn(`Client missed pong, closing connection`);
      client.terminate();
    }, 35000);

    this.heartbeatTimers.set(client, timer);

    if (client.readyState === WebSocket.OPEN) {
      client.ping();
    }
  }

  private clearHeartbeat(client: WebSocket) {
    const timer = this.heartbeatTimers.get(client);
    if (timer) {
      clearTimeout(timer);
      this.heartbeatTimers.delete(client);
    }
  }

  async handleConnection(client: WebSocket) {
    const req = (client as any).__upgradeReq as IncomingMessage;
    if (req) {
      try {
        const url = new URL(
          req.url || '/',
          `http://${req.headers.host || 'localhost'}`,
        );
        const token = url.searchParams.get('token');
        const deviceKey = (url.searchParams.get('key') ||
          req.headers['key']) as string;

        if (deviceKey) {
          const device = await this.iotService.validateDeviceKey(deviceKey);
          if (device) {
            (client as any).device = { ...device, deviceKey };
          } else {
            this.logger.warn(`Device key inválido en conexión, cerrando`);
            client.close(4001, 'Device key revoked');
            return;
          }
        } else if (token) {
          try {
            const payload = await this.jwtService.verifyAsync<{
              sub: string;
              email: string;
              tenantId: string;
            }>(token);
            (client as any).user = payload;
          } catch {
            this.logger.warn(`Token inválido en conexión, cerrando`);
            client.close(4001, 'Invalid token');
            return;
          }
        }
      } catch (e) {
        this.logger.warn(`Connection auth error: ${e}`);
        client.close(4001, 'Connection failed');
        return;
      }
    }

    const info = getClientInfo(client);
    if (info) {
      this.connectedClients.set(client, info);
    }

    client.on('pong', () => {
      this.clearHeartbeat(client);
      this.startHeartbeat(client);
    });

    this.startHeartbeat(client);

    const device = (client as unknown as { device?: DeviceAuth }).device;
    const user = (client as unknown as { user?: UserAuth }).user;

    if (device) {
      this.broadcastToUsers(info!.tenantId, {
        event: 'device_online',
        data: { blowerId: info!.blowerId, blowerConfigId: info!.blowerConfigId },
      });

      try {
        const config = await this.sensorsService.getBlowerConfigById(info!.blowerConfigId!);
        if (config && (config.readIntervalMs || config.scaleFactor)) {
          client.send(JSON.stringify({
            event: 'device_config_update',
            data: {
              blowerId: info!.blowerId,
              readIntervalMs: config.readIntervalMs,
              scaleFactor: config.scaleFactor,
            },
          }));
        }
      } catch (e) {
        this.logger.warn(`Failed to send device config on connect: ${e}`);
      }
    }

    if (user) {
      const onlineDevices = this.getOnlineDevices(user.tenantId);
      if (onlineDevices.length > 0) {
        client.send(JSON.stringify({ event: 'devices_online', data: { devices: onlineDevices } }));
      }
    }
  }

  handleDisconnect(client: WebSocket) {
    this.clearHeartbeat(client);
    const info = this.connectedClients.get(client);
    if (info?.blowerId) {
      this.broadcastToUsers(info.tenantId, {
        event: 'device_offline',
        data: { blowerId: info.blowerId },
      }, client);
    }
    this.connectedClients.delete(client);
  }

  private async isDeviceActive(client: WebSocket): Promise<boolean> {
    const device = (client as unknown as { device?: DeviceAuth }).device;
    if (!device?.deviceKey) return true;

    const valid = await this.iotService.validateDeviceKey(device.deviceKey);
    if (!valid) {
      this.logger.warn(`Device key revoked mid-session, closing connection`);
      client.send(JSON.stringify({ event: 'auth_error', data: { reason: 'key_revoked' } }));
      client.close(4001, 'Device key revoked');
      return false;
    }
    return true;
  }

  @SubscribeMessage('register_blower')
  async handleRegisterBlower(
    @MessageBody() data: { tenantId: string; blowerId: string },
    @ConnectedSocket() client: WebSocket,
  ) {
    try {
      if (!(await this.isDeviceActive(client))) return;

      const clientInfo = this.ensureClientInfo(client);
      const tenantId = data.tenantId || clientInfo?.tenantId;
      const blowerId = data.blowerId || clientInfo?.blowerId;

      if (!tenantId || !blowerId) {
        return { status: 'error', message: 'tenantId and blowerId required' };
      }

      const config = await this.sensorsService.registerBlower(
        tenantId,
        blowerId,
      );

      if (clientInfo) {
        clientInfo.blowerConfigId = config.id;
        clientInfo.blowerId = blowerId;
      }

      client.send(
        JSON.stringify({
          event: 'blower_registered',
          data: {
            blowerConfigId: config.id,
            currentThreshold: config.currentThreshold,
          },
        }),
      );
    } catch (error) {
      this.logger.error(
        `Registration error: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  @SubscribeMessage('pressure_reading')
  async handlePressureReading(
    @MessageBody()
    data: {
      psi?: number;
      blowerId?: string;
      blowerConfigId?: string;
      tenantId?: string;
    },
    @ConnectedSocket() client: WebSocket,
  ) {
    try {
      if (!(await this.isDeviceActive(client))) return;

      const clientInfo = this.ensureClientInfo(client);

      const enriched: CreateSensorDto = {
        psi: data.psi ?? 0,
        blowerConfigId: data.blowerConfigId || clientInfo?.blowerConfigId,
        tenantId: data.tenantId || clientInfo?.tenantId,
        blowerId: data.blowerId || clientInfo?.blowerId,
      };

      const dto = plainToInstance(CreateSensorDto, enriched);
      const errors = await validate(dto);
      if (errors.length > 0) {
        this.logger.warn(
          `Invalid pressure_reading data: ${errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('; ')}`,
        );
        return;
      }

      if (!enriched.blowerConfigId && enriched.tenantId && enriched.blowerId) {
        const config = await this.sensorsService.registerBlower(
          enriched.tenantId,
          enriched.blowerId,
        );
        enriched.blowerConfigId = config.id;
        if (clientInfo) {
          clientInfo.blowerConfigId = config.id;
          clientInfo.blowerId = enriched.blowerId;
        }
      }

      await this.sensorsService.createReading(enriched);

      for (const [c, info] of this.connectedClients) {
        if (c.readyState === WebSocket.OPEN && info.tenantId === enriched.tenantId) {
          c.send(
            JSON.stringify({
              event: 'pressure_reading',
              data: enriched,
            }),
          );
        }
      }

      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event: 'reading_ack', data: { ok: true, ts: Date.now() } }));
      }

      return { ok: true };
    } catch (error) {
      this.logger.error(
        `Pressure reading error: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  @SubscribeMessage('set_new_threshold')
  async handleSetNewThreshold(
    @MessageBody() data: { blowerId?: string; threshold: number },
    @ConnectedSocket() client: WebSocket,
  ) {
    if (!(await this.isDeviceActive(client))) return;

    const clientInfo = this.ensureClientInfo(client);
    const blowerId = data.blowerId || clientInfo?.blowerId;
    const tenantId = clientInfo?.tenantId;

    if (!blowerId || !tenantId) {
      return { status: 'error', message: 'blowerId required' };
    }

    await this.sensorsService.updateThreshold(
      tenantId,
      blowerId,
      data.threshold,
    );

    for (const [c, info] of this.connectedClients) {
      if (c.readyState === WebSocket.OPEN && info.tenantId === tenantId) {
        c.send(
          JSON.stringify({
            event: 'update_threshold',
            data: { threshold: data.threshold, blowerId },
          }),
        );
      }
    }

    return { status: 'success', threshold: data.threshold, blowerId };
  }

  @SubscribeMessage('get_threshold')
  async handleGetThreshold(
    @MessageBody() data: { blowerId?: string },
    @ConnectedSocket() client: WebSocket,
  ) {
    if (!(await this.isDeviceActive(client))) return;

    const clientInfo = this.ensureClientInfo(client);
    const tenantId = clientInfo?.tenantId;
    const blowerId = data?.blowerId || clientInfo?.blowerId;

    if (!tenantId) {
      return { status: 'error', message: 'tenantId required' };
    }

    if (blowerId) {
      const threshold = await this.sensorsService.getLatestThreshold(
        tenantId,
        blowerId,
      );
      client.send(
        JSON.stringify({
          event: 'current_threshold',
          data: { threshold, blowerId },
        }),
      );
    } else {
      const thresholds = await this.sensorsService.getAllThresholds(tenantId);
      client.send(
        JSON.stringify({
          event: 'current_threshold',
          data: { thresholds },
        }),
      );
    }
  }

  @SubscribeMessage('current_threshold')
  handleCurrentThreshold(
    @MessageBody() data: { threshold: number; blowerId?: string },
    @ConnectedSocket() sender: WebSocket,
  ) {
    const senderInfo = this.ensureClientInfo(sender);
    if (!senderInfo) return;

    for (const [client, info] of this.connectedClients) {
      if (client.readyState === WebSocket.OPEN && info.tenantId === senderInfo.tenantId) {
        client.send(JSON.stringify({ event: 'current_threshold', data }));
      }
    }
  }

  @SubscribeMessage('device_info')
  async handleDeviceInfo(
    @MessageBody()
    data: {
      firmware?: string;
      rssi?: number;
      uptime?: number;
      heap?: number;
    },
    @ConnectedSocket() client: WebSocket,
  ) {
    if (!(await this.isDeviceActive(client))) return;

    const clientInfo = this.ensureClientInfo(client);
    if (!clientInfo?.blowerConfigId) return;

    try {
      await this.sensorsService.updateDeviceMetadata(clientInfo.blowerConfigId, {
        firmwareVersion: data.firmware,
        wifiRssi: data.rssi,
        uptimeMs: data.uptime,
        freeHeap: data.heap,
      });

      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event: 'device_info_ack', data: { ok: true } }));
      }
    } catch (error) {
      this.logger.error(
        `Device info error: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  @SubscribeMessage('set_device_config')
  async handleSetDeviceConfig(
    @MessageBody()
    data: {
      blowerId?: string;
      readIntervalMs?: number;
      scaleFactor?: number;
    },
    @ConnectedSocket() client: WebSocket,
  ) {
    if (!(await this.isDeviceActive(client))) return;

    const clientInfo = this.ensureClientInfo(client);
    const blowerId = data.blowerId || clientInfo?.blowerId;
    const tenantId = clientInfo?.tenantId;

    if (!blowerId || !tenantId) {
      return { status: 'error', message: 'blowerId required' };
    }

    const config = await this.sensorsService.getBlowerConfigByTenantAndId(
      tenantId,
      blowerId,
    );
    if (!config) {
      return { status: 'error', message: 'BlowerConfig not found' };
    }

    const update: { readIntervalMs?: number; scaleFactor?: number } = {};
    if (data.readIntervalMs !== undefined) {
      if (data.readIntervalMs < 500 || data.readIntervalMs > 60000) {
        return { status: 'error', message: 'readIntervalMs must be 500-60000' };
      }
      update.readIntervalMs = data.readIntervalMs;
    }
    if (data.scaleFactor !== undefined) {
      if (data.scaleFactor <= 0) {
        return { status: 'error', message: 'scaleFactor must be > 0' };
      }
      update.scaleFactor = data.scaleFactor;
    }

    if (Object.keys(update).length === 0) {
      return { status: 'error', message: 'No valid fields to update' };
    }

    await this.sensorsService.updateDeviceConfig(config.id, update);

    for (const [c, info] of this.connectedClients) {
      if (
        c.readyState === WebSocket.OPEN &&
        info.tenantId === tenantId
      ) {
        c.send(
          JSON.stringify({
            event: 'device_config_update',
            data: { blowerId, ...update },
          }),
        );
      }
    }

    return { status: 'success', blowerId, ...update };
  }
}
