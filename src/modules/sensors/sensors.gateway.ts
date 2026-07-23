import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { Server } from 'ws';
import WebSocket from 'ws';
import { WsAuthGuard } from '../auth/guards/ws-auth.guard';

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
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(SensorsGateway.name);

  @WebSocketServer()
  server!: Server;

  private connectedClients = new Map<WebSocket, EnrichedClient>();

  constructor(private readonly sensorsService: SensorsService) {}

  handleConnection(client: WebSocket) {
    const info = getClientInfo(client);
    this.logger.log(`WS attempt: ${info ? `OK blowerId=${info.blowerId} tenantId=${info.tenantId}` : 'NO INFO'}`);
    if (info) {
      this.connectedClients.set(client, info);
    }
  }

  handleDisconnect(client: WebSocket) {
    const info = this.connectedClients.get(client);
    this.logger.log(`WS disconnect: ${info?.blowerId || 'unknown'}`);
    this.connectedClients.delete(client);
  }

  @SubscribeMessage('register_blower')
  async handleRegisterBlower(
    @MessageBody() data: { tenantId: string; blowerId: string },
    @ConnectedSocket() client: WebSocket,
  ) {
    try {
      const clientInfo = this.connectedClients.get(client);
      const tenantId = data.tenantId || clientInfo?.tenantId;
      const blowerId = data.blowerId || clientInfo?.blowerId;

      if (!tenantId || !blowerId) {
        return { status: 'error', message: 'tenantId and blowerId required' };
      }

      this.logger.log(`Registration requested: blowerId=${blowerId}`);
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
      const clientInfo = this.connectedClients.get(client);

      const enriched: CreateSensorDto = {
        psi: data.psi ?? 0,
        blowerConfigId: data.blowerConfigId || clientInfo?.blowerConfigId,
        tenantId: data.tenantId || clientInfo?.tenantId,
        blowerId: data.blowerId || clientInfo?.blowerId,
      };

      this.logger.debug(
        `Pressure reading: blowerId=${enriched.blowerId} psi=${enriched.psi}`,
      );

      const record = await this.sensorsService.create(enriched);

      for (const [c] of this.connectedClients) {
        if (c.readyState === WebSocket.OPEN) {
          c.send(
            JSON.stringify({
              event: 'pressure_reading',
              data: enriched,
            }),
          );
        }
      }

      return record;
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
    const clientInfo = this.connectedClients.get(client);
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
      if (c.readyState === WebSocket.OPEN && info.blowerId === blowerId) {
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
    const clientInfo = this.connectedClients.get(client);
    const tenantId = clientInfo?.tenantId;
    const blowerId = data?.blowerId || clientInfo?.blowerId;

    if (!tenantId) {
      return { status: 'error', message: 'tenantId required' };
    }

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
  }

  @SubscribeMessage('current_threshold')
  handleCurrentThreshold(
    @MessageBody() data: { threshold: number; blowerId?: string },
  ) {
    for (const [client] of this.connectedClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event: 'current_threshold', data }));
      }
    }
  }
}
