import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { UseGuards } from '@nestjs/common';
import WebSocket from 'ws';
import { DeviceConnectionRegistry } from '../../common/device-connection.registry';
import { WsAuthGuard } from '../auth/guards/ws-auth.guard'; 

@UseGuards(WsAuthGuard)
@WebSocketGateway()
export class SensorsGateway {
  constructor(
    private readonly connectionRegistry: DeviceConnectionRegistry,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private ensureClientInfo(client: WebSocket) {
    let info = this.connectionRegistry.clients.get(client);
    
    if (!info) {
      const device = (client as any).device;
      
      if (device) {
        info = {
          tenantId: device.tenantId,
          blowerId: device.blowerId,
          blowerConfigId: device.blowerConfigId,
        };
        this.connectionRegistry.register(client, info); 
      }
    }
    return info;
  }

  @SubscribeMessage('pressure_reading')
  handlePressureReading(
    @MessageBody() data: any,
    @ConnectedSocket() client: WebSocket,
  ) {
    const clientInfo = this.ensureClientInfo(client);

    if (!clientInfo?.tenantId) return { status: 'error', message: 'Not authenticated' };

    this.eventEmitter.emit('device.reading_received', { 
      data, 
      clientInfo 
    });

    return { ok: true, ts: Date.now() };
  }

  @OnEvent('database.reading_saved')
  broadcastToMobileApp(payload: { tenantId: string, reading: any }) {
    this.connectionRegistry.broadcastToUsers(payload.tenantId, {
      event: 'pressure_reading',
      data: payload.reading,
    });
  }
}