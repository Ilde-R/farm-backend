import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { Server } from 'ws';
import WebSocket from 'ws';
import { WsAuthGuard } from '../auth/guards/ws-auth.guard';

@UseGuards(WsAuthGuard)
@WebSocketGateway()
export class SensorsGateway {
  private readonly logger = new Logger(SensorsGateway.name);

  @WebSocketServer()
  server!: Server;
  constructor(private readonly sensorsService: SensorsService) {}

  @SubscribeMessage('register_blower')
  async handleRegisterBlower(
    @MessageBody() data: { tenantId: string; blowerId: string },
    @ConnectedSocket() client: WebSocket,
  ) {
    try {
      this.logger.log(`Registro de soplador solicitado: ${data.blowerId}`);
      const config = await this.sensorsService.registerBlower(
        data.tenantId,
        data.blowerId,
      );

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
        `Error al registrar soplador: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  @SubscribeMessage('pressure_reading')
  async create(@MessageBody() data: any) {
    try {
      this.logger.log(`Lectura de presión recibida: ${data?.blowerId}`);
      const record = await this.sensorsService.create(data);

      if (this.server && this.server.clients) {
        for (const client of this.server.clients) {
          if (client.readyState === 1) {
            client.send(
              JSON.stringify({
                event: 'pressure_reading',
                data: data,
              }),
            );
          }
        }
      }
      return record;
    } catch (error) {
      this.logger.error(
        `Error al guardar lectura de presión: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  @SubscribeMessage('set_new_threshold')
  handleSetNewThreshold(@MessageBody() data: { threshold: number }) {
    const message = JSON.stringify({
      event: 'update_threshold',
      data: {
        threshold: data.threshold,
      },
    });
    this.server.clients.forEach((client: any) => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });

    return { status: 'success', threshold: data.threshold };
  }

  @SubscribeMessage('get_threshold')
  async handleGetThreshold(@MessageBody() data: any) {
    const threshold = await this.sensorsService.getLatestThreshold(
      data?.blowerId,
    );

    this.server.clients.forEach((client: any) => {
      if (client.readyState === 1) {
        client.send(
          JSON.stringify({
            event: 'current_threshold',
            data: { threshold },
          }),
        );
      }
    });
  }

  @SubscribeMessage('current_threshold')
  handleCurrentThreshold(@MessageBody() data: any) {
    this.server.clients.forEach((client: any) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ event: 'current_threshold', data }));
      }
    });
  }
}
