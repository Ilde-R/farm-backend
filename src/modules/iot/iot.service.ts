import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProvisionDto } from './dto/provision.dto';
import { randomBytes } from 'crypto';
import { IotRepository } from './repositories/iot.repository';

@Injectable()
export class IotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly iotRepository: IotRepository,
  ) {}

  async provision(tenantId: string, dto: ProvisionDto) {
    if (!tenantId) {
      throw new BadRequestException('Token JWT no contiene tenantId válido');
    }

    const tenant = await this.iotRepository.findTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} no encontrado`);
    }

    const blowerConfig = await this.iotRepository.upsertBlowerConfig(
      tenantId,
      dto.blowerId,
      dto.blowerName,
    );

    const key = `blwr_${randomBytes(16).toString('hex')}`;
    const deviceKey = await this.iotRepository.createKey(key, blowerConfig.id);

    return {
      deviceKey: deviceKey.key,
      blowerConfigId: blowerConfig.id,
      blowerId: blowerConfig.blowerId,
      tenantId: blowerConfig.tenantId,
      currentThreshold: blowerConfig.currentThreshold,
    };
  }

  async validateDeviceKey(key: string) {
    const deviceKey = await this.iotRepository.findByKeyWithBlower(key);

    if (!deviceKey || !deviceKey.isActive) {
      return null;
    }

    return {
      blowerConfigId: deviceKey.blowerConfig.id,
      blowerId: deviceKey.blowerConfig.blowerId,
      tenantId: deviceKey.blowerConfig.tenantId,
      currentThreshold: deviceKey.blowerConfig.currentThreshold,
    };
  }

  async listDeviceKeys(tenantId: string) {
    return this.iotRepository.findKeysByTenant(tenantId);
  }

  async revokeDeviceKey(key: string, tenantId: string) {
    const existing = await this.iotRepository.findKeyWithTenant(key);

    if (!existing) {
      throw new NotFoundException(`La llave del dispositivo no existe`);
    }

    if (existing.blowerConfig.tenantId !== tenantId) {
      throw new ForbiddenException(
        `La llave del dispositivo no le pertenece a este tenant`,
      );
    }

    return this.iotRepository.updateKeyActive(key, false);
  }

  async deleteBlower(tenantId: string, blowerId: string) {
    const blower = await this.iotRepository.findBlowerConfig(
      tenantId,
      blowerId,
    );

    if (!blower) {
      throw new NotFoundException(`Blower ${blowerId} no encontrado`);
    }

    if (blower.tenantId !== tenantId) {
      throw new ForbiddenException(`Blower no pertenece a este tenant`);
    }

    await this.iotRepository.deleteBlowerConfig(blower.id);
    return { message: `Blower ${blowerId} eliminado correctamente` };
  }
}
