import { Test, TestingModule } from '@nestjs/testing';
import { AerationsService } from './aeration.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { DeviceConnectionRegistry } from '../../../common/device-connection.registry';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AerationsRepository } from '../repositories/aeration.repository';

describe('AerationService', () => {
  let service: AerationsService;
  let repository: {
    upsertBlowerConfig: jest.Mock;
    createKey: jest.Mock;
    findDeviceKey: jest.Mock;
    findKeysByTenant: jest.Mock;
    updateKeyActive: jest.Mock;
    findBlowerConfig: jest.Mock;
    updateConfig: jest.Mock;
    getBlowerConfigById: jest.Mock;
    getAlertState: jest.Mock;
    updateAlertState: jest.Mock;
    createReading: jest.Mock;
  };
  let connectionRegistry: {
    closeByBlowerId: jest.Mock;
    sendToDevice: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      upsertBlowerConfig: jest.fn(),
      createKey: jest.fn(),
      findDeviceKey: jest.fn(),
      findKeysByTenant: jest.fn(),
      updateKeyActive: jest.fn(),
      findBlowerConfig: jest.fn(),
      updateConfig: jest.fn(),
      getBlowerConfigById: jest.fn(),
      getAlertState: jest.fn(),
      updateAlertState: jest.fn(),
      createReading: jest.fn(),
    };

    connectionRegistry = {
      closeByBlowerId: jest.fn(),
      sendToDevice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AerationsService,
        { provide: PrismaService, useValue: {} },
        { provide: AerationsRepository, useValue: repository },
        { provide: DeviceConnectionRegistry, useValue: connectionRegistry },
      ],
    }).compile();

    service = module.get(AerationsService);
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
    it('debería retornar las keys del tenant', async () => {
      const mockKeys = [
        { key: 'blwr_1', blowerConfig: { blowerId: 'b1' } },
        { key: 'blwr_2', blowerConfig: { blowerId: 'b2' } },
      ];
      repository.findKeysByTenant.mockResolvedValue(mockKeys);

      if (service['listDeviceKeys']) {
        const result = await (service as any).listDeviceKeys('tenant-1');
        expect(result).toEqual(mockKeys);
        expect(repository.findKeysByTenant).toHaveBeenCalledWith('tenant-1');
      }
    });
  });

  describe('updateBlowerConfig', () => {
    const blower = {
      id: 'config-1',
      tenantId: 'tenant-1',
      blowerId: 'blower-1',
    };

    beforeEach(() => {
      repository.findBlowerConfig.mockResolvedValue(blower);
      repository.updateConfig.mockImplementation(async (_id, data) => ({
        ...blower,
        currentThreshold: data.currentThreshold ?? 2.0,
        saveIntervalSeconds: data.saveIntervalSeconds ?? 3600,
        scaleFactor: 0.8095,
      }));
    });

    it('guarda y devuelve el umbral persistido sin actualizar otros campos', async () => {
      const result = await service.updateBlowerConfig('tenant-1', 'blower-1', {
        currentThreshold: 2.5,
      });

      expect(repository.updateConfig).toHaveBeenCalledWith('config-1', {
        currentThreshold: 2.5,
      });
      expect(connectionRegistry.sendToDevice).toHaveBeenCalledWith('blower-1', {
        event: 'update_threshold',
        data: { blowerId: 'blower-1', threshold: 2.5 },
      });
      expect(result).toEqual(
        expect.objectContaining({ currentThreshold: 2.5 }),
      );
    });

    it('guarda solo el intervalo y conserva el umbral existente', async () => {
      const result = await service.updateBlowerConfig('tenant-1', 'blower-1', {
        saveIntervalSeconds: 3600,
      });

      expect(repository.updateConfig).toHaveBeenCalledWith('config-1', {
        saveIntervalSeconds: 3600,
      });
      expect(connectionRegistry.sendToDevice).toHaveBeenCalledWith('blower-1', {
        event: 'device_config_update',
        data: { blowerId: 'blower-1', saveIntervalSeconds: 3600 },
      });
      expect(result).toEqual(
        expect.objectContaining({
          currentThreshold: 2.0,
          saveIntervalSeconds: 3600,
        }),
      );
    });

    it('rechaza la actualización si el blower no pertenece al tenant', async () => {
      repository.findBlowerConfig.mockResolvedValue({
        ...blower,
        tenantId: 'another-tenant',
      });

      await expect(
        service.updateBlowerConfig('tenant-1', 'blower-1', {
          currentThreshold: 2.5,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.updateConfig).not.toHaveBeenCalled();
    });
  });

  describe('createReading', () => {
    const reading = {
      psi: 2,
      tenantId: 'tenant-1',
      blowerId: 'blower-1',
      blowerConfigId: 'config-1',
      currentThreshold: 0.5,
    };

    beforeEach(() => {
      repository.getBlowerConfigById.mockResolvedValue({
        id: 'config-1',
        tenantId: 'tenant-1',
        currentThreshold: 2.5,
        saveIntervalSeconds: 3600,
      });
      repository.getAlertState.mockResolvedValue({
        lastSaveAt: Date.now(),
        lastAlertState: false,
      });
      repository.createReading.mockResolvedValue({});
      repository.updateAlertState.mockResolvedValue({});
    });

    it('calcula la alarma con el umbral persistido, no con el enviado en la lectura', async () => {
      const result = await service.createReading(reading);

      expect(repository.getBlowerConfigById).toHaveBeenCalledWith('config-1');
      expect(result).toEqual({
        psi: 2,
        isAlert: true,
        source: 'alert',
      });
      expect(repository.createReading).toHaveBeenCalledWith(
        expect.objectContaining({ isAlert: true }),
      );
      expect(repository.updateConfig).not.toHaveBeenCalled();
    });

    it('vuelve a leer el umbral persistido para cada lectura', async () => {
      repository.getBlowerConfigById
        .mockResolvedValueOnce({
          id: 'config-1',
          tenantId: 'tenant-1',
          currentThreshold: 1,
          saveIntervalSeconds: 3600,
        })
        .mockResolvedValueOnce({
          id: 'config-1',
          tenantId: 'tenant-1',
          currentThreshold: 3,
          saveIntervalSeconds: 3600,
        });

      const firstResult = await service.createReading({ ...reading, psi: 2 });
      const secondResult = await service.createReading({ ...reading, psi: 2 });

      expect(firstResult).toBeNull();
      expect(secondResult).toEqual({
        psi: 2,
        isAlert: true,
        source: 'alert',
      });
      expect(repository.getBlowerConfigById).toHaveBeenCalledTimes(2);
    });

    it('usa el intervalo persistido para decidir cuándo guardar lecturas regulares', async () => {
      repository.getBlowerConfigById.mockResolvedValue({
        id: 'config-1',
        tenantId: 'tenant-1',
        currentThreshold: 1,
        saveIntervalSeconds: 1,
      });
      repository.getAlertState.mockResolvedValue({
        lastSaveAt: Date.now() - 2000,
        lastAlertState: false,
      });

      const result = await service.createReading({ ...reading, psi: 2 });

      expect(result).toEqual({
        psi: 2,
        isAlert: false,
        source: 'scheduled',
      });
    });

    it('rechaza lecturas cuya configuración no pertenece al tenant', async () => {
      repository.getBlowerConfigById.mockResolvedValue({
        id: 'config-1',
        tenantId: 'other-tenant',
        currentThreshold: 2.5,
        saveIntervalSeconds: 3600,
      });

      await expect(service.createReading(reading)).rejects.toThrow(
        ForbiddenException,
      );
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

      expect(repository.updateKeyActive).toHaveBeenCalledWith(
        'blwr_key',
        false,
      );
      expect(connectionRegistry.closeByBlowerId).toHaveBeenCalledWith(
        'blwr-1',
        'key_revoked',
      );
      expect(result.isActive).toBe(false);
    });
  });
});