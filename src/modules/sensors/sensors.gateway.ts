import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { SensorsService } from './sensors.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Server } from 'ws';

@WebSocketGateway({ cors: true })
export class SensorsGateway {
  @WebSocketServer()
  server!: Server;
  constructor(private readonly sensorsService: SensorsService) {}

  @SubscribeMessage('pressure_reading')
  async create(@MessageBody() data: any) {
    try {
      console.log('¡NUEVO MENSAJE RECIBIDO DEL ARDUINO!:', data);

      // Guardamos la data completa en la base de datos (incluyendo isAlert)
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
      // ¡Ya no tragaremos los errores en silencio!
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
