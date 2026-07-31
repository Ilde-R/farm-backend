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
import { DeviceTimeService } from './services/device-time.service';
import {
  DeviceConnectionRegistry,
  EnrichedClient,
  UserAuth,
} from '../../common/device-connection.registry';

interface DeviceAuth {
  tenantId: string;
  blowerId: string;
  blowerConfigId: string;
  currentThreshold: number;
  deviceKey: string;
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

const DEVICE_REVALIDATION_INTERVAL_MS = 5 * 60 * 1000;

@UseGuards(WsAuthGuard)
@WebSocketGateway()
export class SensorsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(SensorsGateway.name);

  @WebSocketServer()
  server!: Server;

  private heartbeatTimers = new Map<WebSocket, ReturnType<typeof setTimeout>>();
  private revalidationTimers = new Map<
    WebSocket,
    ReturnType<typeof setInterval>
  >();

  private ensureClientInfo(client: WebSocket): EnrichedClient | undefined {
    let info = this.connectionRegistry.clients.get(client);
    if (!info) {
      info = getClientInfo(client);
      if (info) {
        this.connectionRegistry.register(client, info);
      }
    }
    return info;
  }

  constructor(
    private readonly sensorsService: SensorsService,
    private readonly iotService: IotService,
    private readonly jwtService: JwtService,
    private readonly deviceTimeService: DeviceTimeService,
    private readonly connectionRegistry: DeviceConnectionRegistry,
  ) {}

  private broadcastToUsers(
    tenantId: string,
    message: { event: string; data: any },
    exclude?: WebSocket,
  ) {
    this.connectionRegistry.broadcastToUsers(tenantId, message, exclude);
  }

  private getOnlineDevices(tenantId: string) {
    return this.connectionRegistry.getOnlineDevices(tenantId);
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

  /**
   * Starts a periodic re-validation timer for device keys.
   * Instead of validating on every message (1 query/message), we validate
   * once on connection and then re-check every 5 minutes.
   */
  private startDeviceRevalidation(client: WebSocket) {
    const device = (client as unknown as { device?: DeviceAuth }).device;
    if (!device?.deviceKey) return;

    const timer = setInterval(async () => {
      try {
        const valid = await this.iotService.validateDeviceKey(device.deviceKey);
        if (!valid) {
          this.logger.warn(
            `Device key revoked mid-session, closing connection`,
          );
          client.send(
            JSON.stringify({
              event: 'auth_error',
              data: { reason: 'key_revoked' },
            }),
          );
          client.close(4001, 'Device key revoked');
          this.clearDeviceRevalidation(client);
        }
      } catch (e) {
        this.logger.warn(`Device revalidation error: ${e}`);
      }
    }, DEVICE_REVALIDATION_INTERVAL_MS);

    this.revalidationTimers.set(client, timer);
  }

  private clearDeviceRevalidation(client: WebSocket) {
    const timer = this.revalidationTimers.get(client);
    if (timer) {
      clearInterval(timer);
      this.revalidationTimers.delete(client);
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
      this.connectionRegistry.register(client, info);
    }

    client.on('pong', () => {
      this.clearHeartbeat(client);
      this.startHeartbeat(client);
    });

    this.startHeartbeat(client);
    // Start periodic device key re-validation (every 5 min instead of every message)
    this.startDeviceRevalidation(client);

    const device = (client as unknown as { device?: DeviceAuth }).device;
    const user = (client as unknown as { user?: UserAuth }).user;

    if (device) {
      this.broadcastToUsers(info!.tenantId, {
        event: 'device_online',
        data: {
          blowerId: info!.blowerId,
          blowerConfigId: info!.blowerConfigId,
        },
      });

      try {
        const config = await this.sensorsService.getBlowerConfigById(
          info!.blowerConfigId!,
        );
        if (config && config.scaleFactor) {
          client.send(
            JSON.stringify({
              event: 'device_config_update',
              data: {
                blowerId: info!.blowerId,
                scaleFactor: config.scaleFactor,
              },
            }),
          );
        }
      } catch (e) {
        this.logger.warn(`Failed to send device config on connect: ${e}`);
      }
    }

    if (user) {
      const onlineDevices = this.getOnlineDevices(user.tenantId);
      if (onlineDevices.length > 0) {
        client.send(
          JSON.stringify({
            event: 'devices_online',
            data: { devices: onlineDevices },
          }),
        );
      }
    }
  }

  handleDisconnect(client: WebSocket) {
    this.clearHeartbeat(client);
    this.clearDeviceRevalidation(client);
    const info = this.connectionRegistry.clients.get(client);
    if (info?.blowerId) {
      this.broadcastToUsers(
        info.tenantId,
        {
          event: 'device_offline',
          data: { blowerId: info.blowerId },
        },
        client,
      );
    }
    this.connectionRegistry.unregister(client);
  }

  @SubscribeMessage('register_blower')
  async handleRegisterBlower(
    @MessageBody() data: { tenantId: string; blowerId: string },
    @ConnectedSocket() client: WebSocket,
  ) {
    try {
      const clientInfo = this.ensureClientInfo(client);
      const tenantId = data.tenantId || clientInfo?.tenantId;
      const blowerId = data.blowerId || clientInfo?.blowerId;

      if (!tenantId || !blowerId) {
        return { status: 'error', message: 'tenantId y blowerId requeridos' };
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
      ts?: number;
    },
    @ConnectedSocket() client: WebSocket,
  ) {
    try {
      const clientInfo = this.ensureClientInfo(client);

      const enriched: CreateSensorDto = {
        psi: data.psi ?? 0,
        blowerConfigId: data.blowerConfigId || clientInfo?.blowerConfigId,
        tenantId: data.tenantId || clientInfo?.tenantId,
        blowerId: data.blowerId || clientInfo?.blowerId,
        deviceTs: data.ts,
        deviceTime:
          data.ts !== undefined && clientInfo?.blowerConfigId
            ? this.deviceTimeService.toRealTime(
                clientInfo.blowerConfigId,
                data.ts,
              )
            : undefined,
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

      for (const [c, info] of this.connectionRegistry.clients) {
        if (
          c.readyState === WebSocket.OPEN &&
          info.tenantId === enriched.tenantId
        ) {
          c.send(
            JSON.stringify({
              event: 'pressure_reading',
              data: enriched,
            }),
          );
        }
      }

      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            event: 'reading_ack',
            data: { ok: true, ts: Date.now() },
          }),
        );
      }

      return { ok: true };
    } catch (error) {
      this.logger.error(
        `Pressure reading error: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  @SubscribeMessage('batch_readings')
  async handleBatchReadings(
    @MessageBody()
    data: {
      readings: { psi: number; ts?: number }[];
    },
    @ConnectedSocket() client: WebSocket,
  ) {
    try {
      const clientInfo = this.ensureClientInfo(client);
      if (!clientInfo?.blowerConfigId || !clientInfo?.tenantId) return;

      // Use last reading, pass through createReading (respects saveIntervalSeconds throttle)
      const last = data.readings[data.readings.length - 1];
      if (last) {
        await this.sensorsService.createReading({
          psi: last.psi,
          blowerId: clientInfo.blowerId,
          blowerConfigId: clientInfo.blowerConfigId,
          tenantId: clientInfo.tenantId,
          deviceTs: last.ts,
          deviceTime:
            last.ts !== undefined
              ? this.deviceTimeService.toRealTime(
                  clientInfo.blowerConfigId,
                  last.ts,
                )
              : undefined,
        });

        // Broadcast to user clients
        for (const [c, info] of this.connectionRegistry.clients) {
          if (
            c.readyState === WebSocket.OPEN &&
            info.tenantId === clientInfo.tenantId &&
            !info.blowerId
          ) {
            c.send(
              JSON.stringify({
                event: 'pressure_reading',
                data: {
                  psi: last.psi,
                  blowerId: clientInfo.blowerId,
                  blowerConfigId: clientInfo.blowerConfigId,
                  tenantId: clientInfo.tenantId,
                  deviceTs: last.ts,
                },
              }),
            );
          }
        }
      }

      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            event: 'batch_ack',
            data: { ok: true, count: data.readings.length, ts: Date.now() },
          }),
        );
      }
    } catch (error) {
      this.logger.error(
        `Batch readings error: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  @SubscribeMessage('set_new_threshold')
  async handleSetNewThreshold(
    @MessageBody() data: { blowerId?: string; threshold: number },
    @ConnectedSocket() client: WebSocket,
  ) {
    const clientInfo = this.ensureClientInfo(client);
    const blowerId = data.blowerId || clientInfo?.blowerId;
    const tenantId = clientInfo?.tenantId;

    if (!blowerId || !tenantId) {
      return { status: 'error', message: 'blowerId requerido' };
    }

    await this.sensorsService.updateThreshold(
      tenantId,
      blowerId,
      data.threshold,
    );

    for (const [c, info] of this.connectionRegistry.clients) {
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
    const clientInfo = this.ensureClientInfo(client);
    const tenantId = clientInfo?.tenantId;
    const blowerId = data?.blowerId || clientInfo?.blowerId;

    if (!tenantId) {
      return { status: 'error', message: 'tenantId requerido' };
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

    for (const [client, info] of this.connectionRegistry.clients) {
      if (
        client.readyState === WebSocket.OPEN &&
        info.tenantId === senderInfo.tenantId
      ) {
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
    const clientInfo = this.ensureClientInfo(client);
    if (!clientInfo?.blowerConfigId) return;

    try {
      await this.sensorsService.updateDeviceMetadata(
        clientInfo.blowerConfigId,
        {
          firmwareVersion: data.firmware,
          wifiRssi: data.rssi,
          uptimeMs: data.uptime,
          freeHeap: data.heap,
        },
      );

      // Register boot time offset for device timestamp conversion
      if (data.uptime !== undefined) {
        this.deviceTimeService.registrarDeviceInfo(
          clientInfo.blowerConfigId,
          data.uptime * 1000,
        );
      }

      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({ event: 'device_info_ack', data: { ok: true } }),
        );
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
      scaleFactor?: number;
    },
    @ConnectedSocket() client: WebSocket,
  ) {
    const clientInfo = this.ensureClientInfo(client);
    const blowerId = data.blowerId || clientInfo?.blowerId;
    const tenantId = clientInfo?.tenantId;

    if (!blowerId || !tenantId) {
      return { status: 'error', message: 'blowerId requerido' };
    }

    const config = await this.sensorsService.getBlowerConfigByTenantAndId(
      tenantId,
      blowerId,
    );
    if (!config) {
      return {
        status: 'error',
        message: 'Configuración del blower no encontrada',
      };
    }

    const update: { scaleFactor?: number } = {};
    if (data.scaleFactor !== undefined) {
      if (data.scaleFactor <= 0) {
        return { status: 'error', message: 'scaleFactor debe ser > 0' };
      }
      update.scaleFactor = data.scaleFactor;
    }

    if (Object.keys(update).length === 0) {
      return {
        status: 'error',
        message: 'No hay campos válidos para actualizar',
      };
    }

    await this.sensorsService.updateDeviceConfig(config.id, update);

    for (const [c, info] of this.connectionRegistry.clients) {
      if (c.readyState === WebSocket.OPEN && info.tenantId === tenantId) {
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
