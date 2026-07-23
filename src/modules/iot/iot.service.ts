import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProvisionDto } from './dto/provision.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class IotService {
  private readonly logger = new Logger(IotService.name);

  constructor(private readonly prisma: PrismaService) {}

  async provision(tenantId: string, dto: ProvisionDto) {
    if (!tenantId) {
      throw new BadRequestException('Token JWT no contiene tenantId válido');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const blowerConfig = await this.prisma.blowerConfig.upsert({
      where: {
        tenantId_blowerId: {
          tenantId: tenantId,
          blowerId: dto.blowerId,
        },
      },
      update: {
        name: dto.blowerName,
      },
      create: {
        blowerId: dto.blowerId,
        name: dto.blowerName,
        tenant: { connect: { id: tenantId } },
        currentThreshold: 2.0,
      },
    });

    const key = `blwr_${randomBytes(16).toString('hex')}`;

    const deviceKey = await this.prisma.deviceKey.create({
      data: {
        key,
        blowerConfig: { connect: { id: blowerConfig.id } },
      },
    });

    this.logger.log(
      `Device provisioned: key=${key} → blowerConfigId=${blowerConfig.id}`,
    );

    return {
      deviceKey: deviceKey.key,
      blowerConfigId: blowerConfig.id,
      blowerId: blowerConfig.blowerId,
      tenantId: blowerConfig.tenantId,
      currentThreshold: blowerConfig.currentThreshold,
    };
  }

  async validateDeviceKey(key: string) {
    const deviceKey = await this.prisma.deviceKey.findUnique({
      where: { key },
      include: {
        blowerConfig: true,
      },
    });

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
    return this.prisma.deviceKey.findMany({
      where: {
        blowerConfig: { tenantId },
      },
      include: {
        blowerConfig: {
          select: {
            blowerId: true,
            name: true,
            firmwareVersion: true,
            wifiRssi: true,
            uptimeMs: true,
            freeHeap: true,
            readIntervalMs: true,
            scaleFactor: true,
          },
        },
      },
    });
  }

  async revokeDeviceKey(key: string) {
    const existing = await this.prisma.deviceKey.findUnique({ where: { key } });
    if (!existing) {
      throw new NotFoundException(`Device key not found`);
    }
    return this.prisma.deviceKey.update({
      where: { key },
      data: { isActive: false },
    });
  }
}
