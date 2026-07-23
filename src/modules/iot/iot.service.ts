import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProvisionDto } from './dto/provision.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class IotService {
  private readonly logger = new Logger(IotService.name);

  constructor(private readonly prisma: PrismaService) {}

  async provision(tenantId: string, dto: ProvisionDto) {
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
          select: { blowerId: true, name: true },
        },
      },
    });
  }

  async revokeDeviceKey(key: string) {
    return this.prisma.deviceKey.update({
      where: { key },
      data: { isActive: false },
    });
  }
}
