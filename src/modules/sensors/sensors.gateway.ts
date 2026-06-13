import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { SensorsService } from './sensors.service';
import { Server } from 'ws';
import WebSocket from 'ws';

@WebSocketGateway({ cors: true })
export class SensorsGateway {
  @WebSocketServer()
  server!: Server;
  constructor(private readonly sensorsService: SensorsService) {}

  @SubscribeMessage('register_blower')
  async handleRegisterBlower(
    @MessageBody() data: { tenantId: string; blowerId: string },
    @ConnectedSocket() client: WebSocket,
  ) {
    try {
      console.log('Registro de soplador solicitado:', data);
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
      console.error('ERROR AL REGISTRAR SOPLADOR:', error);
    }
  }

  @SubscribeMessage('pressure_reading')
  async create(@MessageBody() data: any) {
    try {
      console.log('¡NUEVO MENSAJE RECIBIDO DEL ARDUINO!:', data);

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
      console.error('ERROR AL GUARDAR LECTURA DE PRESIÓN:', error);
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
    const threshold = await this.sensorsService.getLatestThreshold(data?.blowerId);

    this.server.clients.forEach((client: any) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          event: 'current_threshold',
          data: { threshold }
        }));
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
