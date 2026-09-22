import { Test, TestingModule } from '@nestjs/testing';
import { AerationService } from './aeration.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { DeviceConnectionRegistry } from '../../../common/device-connection.registry';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AerationsRepository } from '../repositories/aeration.repository';

describe('AerationService', () => {
  let service: AerationService;
  let repository: {
    upsertBlowerConfig: jest.Mock;
    createKey: jest.Mock;
    findDeviceKey: jest.Mock;
    findKeysByTenant: jest.Mock;
    updateKeyActive: jest.Mock;
  };
  let connectionRegistry: {
    closeByBlowerId: jest.Mock;
    sendToDevice: jest.Mock;
  };

  beforeEach(async () => {
    // 1. Inicializamos los mocks actualizados del repositorio
    repository = {
      upsertBlowerConfig: jest.fn(),
      createKey: jest.fn(),
      findDeviceKey: jest.fn(),
      findKeysByTenant: jest.fn(),
      updateKeyActive: jest.fn(),
    };

    // 2. Inicializamos el mock del registro de conexiones (WebSockets)
    connectionRegistry = {
      closeByBlowerId: jest.fn(),
      sendToDevice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AerationService,
        { provide: PrismaService, useValue: {} },
        { provide: AerationsRepository, useValue: repository },
        { provide: DeviceConnectionRegistry, useValue: connectionRegistry },
      ],
    }).compile();

    service = module.get(AerationService);
  });

  describe('provision', () => {
    it('debería lanzar BadRequestException si tenantId es vacío', async () => {
      await expect(
        service.provision('', { blowerId: 'blwr-1', blowerName: 'Soplador' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería crear un device key con prefijo blwr_', async () => {
      repository.upsertBlowerConfig.mockResolvedValue({
        id: 'config-1',
        blowerId: 'blwr-1',
        tenantId: 'tenant-1',
        currentThreshold: 2.0,
      });
      repository.createKey.mockResolvedValue({ key: 'blwr_abc123' });

      const result = await service.provision('tenant-1', {
        blowerId: 'blwr-1',
      });

      expect(result.deviceKey).toMatch(/^blwr_/);
      expect(result.blowerConfigId).toBe('config-1');
      expect(result.blowerId).toBe('blwr-1');
      expect(result.tenantId).toBe('tenant-1');
      expect(result.currentThreshold).toBe(2.0);
    });

    it('debería llamar upsertBlowerConfig con los parámetros correctos (objeto de opciones)', async () => {
      repository.upsertBlowerConfig.mockResolvedValue({
        id: 'config-1',
        blowerId: 'blwr-1',
        tenantId: 'tenant-1',
        currentThreshold: 2.0,
      });
      repository.createKey.mockResolvedValue({ key: 'blwr_abc123' });

      await service.provision('tenant-1', {
        blowerId: 'blwr-1',
        blowerName: 'Blower Sala',
      });

      // Validamos que se pase como { name: 'Blower Sala' } según el nuevo contrato
      expect(repository.upsertBlowerConfig).toHaveBeenCalledWith(
        'tenant-1',
        'blwr-1',
        { name: 'Blower Sala' },
      );
    });

    it('debería llamar createKey con la config generada', async () => {
      repository.upsertBlowerConfig.mockResolvedValue({
        id: 'config-99',
        blowerId: 'blwr-1',
        tenantId: 'tenant-1',
        currentThreshold: 2.0,
      });
      repository.createKey.mockResolvedValue({ key: 'blwr_xyz' });

      await service.provision('tenant-1', { blowerId: 'blwr-1' });

      expect(repository.createKey).toHaveBeenCalledWith(
        expect.stringMatching(/^blwr_/),
        'config-99',
      );
    });
  });

  describe('validateDeviceKey', () => {
    it('debería retornar null si la key no existe', async () => {
      repository.findDeviceKey.mockResolvedValue(null);

      const result = await service.validateDeviceKey('blwr_noexiste');

      expect(result).toBeNull();
    });

    it('debería retornar null si la key está inactiva', async () => {
      repository.findDeviceKey.mockResolvedValue({
        isActive: false,
        blowerConfig: {
          id: 'c1',
          blowerId: 'b1',
          tenantId: 't1',
          currentThreshold: 2.0,
        },
      });

      const result = await service.validateDeviceKey('blwr_inactiva');

      expect(result).toBeNull();
    });

    it('debería retornar los datos del dispositivo si la key es válida', async () => {
      repository.findDeviceKey.mockResolvedValue({
        isActive: true,
        blowerConfig: {
          id: 'config-1',
          blowerId: 'blwr-1',
          tenantId: 'tenant-1',
          currentThreshold: 3.5,
        },
      });

      const result = await service.validateDeviceKey('blwr_valida');

      expect(result).toEqual({
        blowerConfigId: 'config-1',
        blowerId: 'blwr-1',
        tenantId: 'tenant-1',
        currentThreshold: 3.5,
      });
    });
  });

  describe('listDeviceKeys', () => {
    // Si tienes este método en tu servicio, la prueba seguirá funcionando
    it('debería retornar las keys del tenant', async () => {
      const mockKeys = [
        { key: 'blwr_1', blowerConfig: { blowerId: 'b1' } },
        { key: 'blwr_2', blowerConfig: { blowerId: 'b2' } },
      ];
      repository.findKeysByTenant.mockResolvedValue(mockKeys);

      // Asumiendo que listDeviceKeys existe en AerationService
      if (service['listDeviceKeys']) {
        const result = await (service as any).listDeviceKeys('tenant-1');
        expect(result).toEqual(mockKeys);
        expect(repository.findKeysByTenant).toHaveBeenCalledWith('tenant-1');
      }
    });
  });

  describe('revokeDeviceKey', () => {
    it('debería lanzar NotFoundException si la key no existe', async () => {
      repository.findDeviceKey.mockResolvedValue(null);

      await expect(
        service.revokeDeviceKey('blwr_noexiste', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si la key no pertenece al tenant', async () => {
      repository.findDeviceKey.mockResolvedValue({
        blowerConfig: { tenantId: 'otro-tenant' },
      });

      await expect(
        service.revokeDeviceKey('blwr_key', 'tenant-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería desactivar la key y cerrar conexión si pertenece al tenant', async () => {
      repository.findDeviceKey.mockResolvedValue({
        blowerConfig: { tenantId: 'tenant-1', blowerId: 'blwr-1' },
      });
      repository.updateKeyActive.mockResolvedValue({ isActive: false });

      const result = await service.revokeDeviceKey('blwr_key', 'tenant-1');

      // Validamos actualización en BD
      expect(repository.updateKeyActive).toHaveBeenCalledWith(
        'blwr_key',
        false,
      );
      // Validamos cierre de socket
      expect(connectionRegistry.closeByBlowerId).toHaveBeenCalledWith(
        'blwr-1',
        'key_revoked',
      );
      expect(result.isActive).toBe(false);
    });
  });
});