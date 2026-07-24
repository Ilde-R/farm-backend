import { Test, TestingModule } from '@nestjs/testing';
import { IotService } from './iot.service';
import { IotRepository } from './repositories/iot.repository';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

describe('IotService', () => {
  let service: IotService;
  let repository: {
    findTenantById: jest.Mock;
    upsertBlowerConfig: jest.Mock;
    createKey: jest.Mock;
    findByKeyWithBlower: jest.Mock;
    findKeysByTenant: jest.Mock;
    findKeyWithTenant: jest.Mock;
    updateKeyActive: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findTenantById: jest.fn(),
      upsertBlowerConfig: jest.fn(),
      createKey: jest.fn(),
      findByKeyWithBlower: jest.fn(),
      findKeysByTenant: jest.fn(),
      findKeyWithTenant: jest.fn(),
      updateKeyActive: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IotService,
        { provide: PrismaService, useValue: {} },
        { provide: IotRepository, useValue: repository },
      ],
    }).compile();

    service = module.get(IotService);
  });

  describe('provision', () => {
    it('debería lanzar BadRequestException si tenantId es vacío', async () => {
      await expect(
        service.provision('', { blowerId: 'blwr-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar NotFoundException si el tenant no existe', async () => {
      repository.findTenantById.mockResolvedValue(null);

      await expect(
        service.provision('tenant-1', { blowerId: 'blwr-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería crear un device key con prefijo blwr_', async () => {
      repository.findTenantById.mockResolvedValue({ id: 'tenant-1' });
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

    it('debería llamar upsertBlowerConfig con los parámetros correctos', async () => {
      repository.findTenantById.mockResolvedValue({ id: 'tenant-1' });
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
        'Blower Sala',
      );
    });

    it('debería llamar createKey con la config generada', async () => {
      repository.findTenantById.mockResolvedValue({ id: 'tenant-1' });
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
      repository.findByKeyWithBlower.mockResolvedValue(null);

      const result = await service.validateDeviceKey('blwr_noexiste');

      expect(result).toBeNull();
    });

    it('debería retornar null si la key está inactiva', async () => {
      repository.findByKeyWithBlower.mockResolvedValue({
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
      repository.findByKeyWithBlower.mockResolvedValue({
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

      const result = await service.listDeviceKeys('tenant-1');

      expect(result).toEqual(mockKeys);
      expect(repository.findKeysByTenant).toHaveBeenCalledWith('tenant-1');
    });
  });

  describe('revokeDeviceKey', () => {
    it('debería lanzar NotFoundException si la key no existe', async () => {
      repository.findKeyWithTenant.mockResolvedValue(null);

      await expect(
        service.revokeDeviceKey('blwr_noexiste', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si la key no pertenece al tenant', async () => {
      repository.findKeyWithTenant.mockResolvedValue({
        blowerConfig: { tenantId: 'otro-tenant' },
      });

      await expect(
        service.revokeDeviceKey('blwr_key', 'tenant-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería desactivar la key si pertenece al tenant', async () => {
      repository.findKeyWithTenant.mockResolvedValue({
        blowerConfig: { tenantId: 'tenant-1' },
      });
      repository.updateKeyActive.mockResolvedValue({ isActive: false });

      const result = await service.revokeDeviceKey('blwr_key', 'tenant-1');

      expect(repository.updateKeyActive).toHaveBeenCalledWith(
        'blwr_key',
        false,
      );
      expect(result.isActive).toBe(false);
    });
  });
});
