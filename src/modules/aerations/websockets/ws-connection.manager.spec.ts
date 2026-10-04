import WebSocket from 'ws';
import { JwtService } from '@nestjs/jwt';
import { DeviceConnectionRegistry } from '../../../common/device-connection.registry';
import { AerationsService } from '../services/aeration.service';
import { DeviceTimeService } from '../services/device-time.service';
import { WsConnectionManager } from './ws-connection.manager';

describe('WsConnectionManager', () => {
  it('envía al blower la configuración actual de la base de datos al reconectar', async () => {
    const client = {
      readyState: WebSocket.OPEN,
      on: jest.fn(),
      ping: jest.fn(),
      send: jest.fn(),
      terminate: jest.fn(),
    } as unknown as WebSocket;
    const clientInfo = {
      tenantId: 'tenant-1',
      blowerId: 'blower-1',
      blowerConfigId: 'config-1',
    };
    const registry = {
      clients: new Map([[client, clientInfo]]),
      broadcastToUsers: jest.fn(),
      hasConnectionForBlowerConfig: jest.fn().mockReturnValue(false),
      unregister: jest.fn(),
    };
    const aerationsService = {
      getBlowerConfigById: jest.fn().mockResolvedValue({
        currentThreshold: 2.5,
        saveIntervalSeconds: 3600,
        scaleFactor: 0.8095,
      }),
    };
    const deviceTimeService = { clearDeviceInfo: jest.fn() };
    const manager = new WsConnectionManager(
      registry as unknown as DeviceConnectionRegistry,
      {} as JwtService,
      aerationsService as unknown as AerationsService,
      deviceTimeService as unknown as DeviceTimeService,
    );
    (client as unknown as { device: object }).device = {};

    await manager.handleClientConnection(client);

    expect(aerationsService.getBlowerConfigById).toHaveBeenCalledWith('config-1');
    expect(client.send).toHaveBeenNthCalledWith(
      1,
      JSON.stringify({
        event: 'device_config_update',
        data: {
          blowerId: 'blower-1',
          scaleFactor: 0.8095,
          saveIntervalSeconds: 3600,
        },
      }),
    );
    expect(client.send).toHaveBeenNthCalledWith(
      2,
      JSON.stringify({
        event: 'update_threshold',
        data: { blowerId: 'blower-1', threshold: 2.5 },
      }),
    );

    manager.handleClientDisconnect(client);
  });
});
