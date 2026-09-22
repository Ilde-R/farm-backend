import { WebSocketGateway, SubscribeMessage, MessageBody, WebSocketServer, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server } from 'ws';
import WebSocket from 'ws';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { WsConnectionManager } from './ws-connection.manager';
import { WsAuthGuard } from '../../auth/guards/ws-auth.guard';
import { AerationsService } from '../services/aeration.service';

@UseGuards(WsAuthGuard)
@WebSocketGateway()
export class AerationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly wsManager: WsConnectionManager,
    private readonly aerationsService: AerationsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  afterInit(server: Server) {
    this.wsManager.setupUpgradeReqInjection(server);
  }

  async handleConnection(client: WebSocket) {
    await this.wsManager.handleClientConnection(client);
  }

  handleDisconnect(client: WebSocket) {
    this.wsManager.handleClientDisconnect(client);
  }

  @SubscribeMessage('pressure_reading')
  handlePressureReading(@MessageBody() data: any, @ConnectedSocket() client: WebSocket) {
    const clientInfo = this.wsManager.getClientInfo(client);
    if (!clientInfo?.tenantId) return;

    this.eventEmitter.emit('device.reading_received', { data, clientInfo });

    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ event: 'reading_ack', data: { ok: true, ts: Date.now() } }));
    }
  }

  @OnEvent('database.reading_saved')
  broadcastToMobileApp(payload: { tenantId: string, reading: any }) {
    this.wsManager.registry.broadcastToUsers(payload.tenantId, {
      event: 'pressure_reading',
      data: payload.reading,
    });
  }

  @SubscribeMessage('set_new_threshold')
  async handleSetNewThreshold(@MessageBody() data: { blowerId?: string; threshold: number }, @ConnectedSocket() client: WebSocket) {
    const clientInfo = this.wsManager.getClientInfo(client);
    const blowerId = data.blowerId || clientInfo?.blowerId;
    
    if (!blowerId || !clientInfo?.tenantId) return { status: 'error', message: 'blowerId requerido' };

    await this.aerationsService.updateThreshold(clientInfo.tenantId, blowerId, data.threshold);

    this.wsManager.registry.broadcastToUsers(clientInfo.tenantId, {
      event: 'update_threshold',
      data: { threshold: data.threshold, blowerId },
    });

    return { status: 'success', threshold: data.threshold, blowerId };
  }

  @SubscribeMessage('register_blower')
  async handleRegisterBlower(@MessageBody() data: { blowerId: string }, @ConnectedSocket() client: WebSocket) {
    const clientInfo = this.wsManager.getClientInfo(client);
    if (!clientInfo?.tenantId) return { status: 'error', message: 'Not authenticated' };

    const blowerId = clientInfo.blowerId ?? data.blowerId;
    const config = await this.aerationsService.registerBlower(clientInfo.tenantId, blowerId);

    if (clientInfo) {
      clientInfo.blowerConfigId = config.id;
      clientInfo.blowerId = blowerId;
      this.wsManager.registry.register(client, clientInfo); 
    }

    client.send(JSON.stringify({
      event: 'blower_registered',
      data: { blowerConfigId: config.id, currentThreshold: config.currentThreshold },
    }));
  }
}