import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class IotRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTenantById(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
  }

  async upsertBlowerConfig(
    tenantId: string,
    blowerId: string,
    blowerName?: string,
  ) {
    return this.prisma.blowerConfig.upsert({
      where: { tenantId_blowerId: { tenantId, blowerId } },
      update: { name: blowerName },
      create: {
        blowerId,
        name: blowerName,
        tenant: { connect: { id: tenantId } },
        currentThreshold: 2.0,
      },
    });
  }

  async createKey(key: string, blowerConfigId: string) {
    return this.prisma.deviceKey.create({
      data: { key, blowerConfig: { connect: { id: blowerConfigId } } },
    });
  }

  findByKeyWithBlower(key: string) {
    return this.prisma.deviceKey.findUnique({
      where: { key },
      include: {
        blowerConfig: true,
      },
    });
  }

  async findKeysByTenant(tenantId: string) {
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
            saveIntervalSeconds: true,
          },
        },
      },
    });
  }

  async findKeyWithTenant(key: string) {
    return this.prisma.deviceKey.findUnique({
      where: { key },
      include: {
        blowerConfig: {
          select: {
            tenantId: true,
            blowerId: true,
          },
        },
      },
    });
  }

  async updateKeyActive(key: string, isActive: boolean) {
    return this.prisma.deviceKey.update({
      where: { key },
      data: { isActive },
    });
  }

  async findBlowerConfig(tenantId: string, blowerId: string) {
    return this.prisma.blowerConfig.findUnique({
      where: { tenantId_blowerId: { tenantId, blowerId } },
    });
  }

  async updateBlowerConfig(
    blowerConfigId: string,
    data: { saveIntervalSeconds?: number },
  ) {
    return this.prisma.blowerConfig.update({
      where: { id: blowerConfigId },
      data,
    });
  }

  async deleteBlowerConfig(blowerConfigId: string) {
    await this.prisma.deviceKey.deleteMany({
      where: { blowerConfigId },
    });
    return this.prisma.blowerConfig.delete({
      where: {
        id: blowerConfigId,
      },
    });
  }
}
