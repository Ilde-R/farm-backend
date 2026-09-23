import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/abstracts/base.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, PressureReading } from '@prisma/client';
import { IngestReadingDto } from '../dto/ingest-reading.dto';

@Injectable()
export class AerationsRepository extends BaseRepository<
  PressureReading,
  IngestReadingDto,
  Partial<PressureReading>
> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.pressureReading);
  }

  async upsertBlowerConfig(
    tenantId: string,
    blowerId: string,
    options?: {
      currentThreshold?: number;
      name?: string;
    },
  ) {
    return this.prisma.blowerConfig.upsert({
      where: {
        tenantId_blowerId: { tenantId, blowerId },
      },
      update: {
        ...(options?.name !== undefined ? { name: options.name } : {}),
        ...(options?.currentThreshold !== undefined ? { currentThreshold: options.currentThreshold } : {}),
      },
      create: {
        blowerId,
        tenant: { connect: { id: tenantId } },
        currentThreshold: options?.currentThreshold ?? 2.0,
        name: options?.name ?? `Soplador ${blowerId}`,
      },
    });
  }

  async findBlowerConfig(tenantId: string, blowerId: string) {
    return this.prisma.blowerConfig.findUnique({
      where: { 
        tenantId_blowerId: { tenantId, blowerId } },
    })
  }

  async getBlowerConfigById(blowerConfigId: string) {
    return this.prisma.blowerConfig.findUnique({
      where: { id: blowerConfigId },
    });
  }

  async getFirstBlowerConfig(tenantId: string) {
    return this.prisma.blowerConfig.findFirst({
      where: { tenantId },
    });
  }

  async getAllBlowerConfigs(tenantId: string) {
    return this.prisma.blowerConfig.findMany({ where: { tenantId } });
  }

  async updateConfig(
    blowerConfigId: string,
    data: {
      currentThreshold?: number;
      saveIntervalSeconds?: number;
      readIntervalMs?: number;
      scaleFactor?: number;
    },
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
      where: { id: blowerConfigId },
    });
  }

  async createKey(key: string, blowerConfigId: string) {
    return this.prisma.deviceKey.create({
      data: { key, blowerConfig: { connect: { id: blowerConfigId } } },
    });
  }

  async findDeviceKey(key: string) {
    return this.prisma.deviceKey.findUnique({
      where: { key },
      include: { blowerConfig: true },
    });
  }

  async findKeysByTenant(tenantId: string) {
    return this.prisma.deviceKey.findMany({
      where: { blowerConfig: { tenantId } },
      include: { blowerConfig: true },
    });
  }

  async updateKeyActive(key: string, isActive: boolean) {
    return this.prisma.deviceKey.update({
      where: { key },
      data: { isActive },
    });
  }

  async updateDeviceMetadata(
    blowerConfigId: string,
    data: {
      firmwareVersion?: string;
      wifiRssi?: number;
      uptimeMs?: number;
      freeHeap?: number;
    },
  ) {
    return this.prisma.blowerConfig.update({
      where: { id: blowerConfigId },
      data,
    });
  }

  async createReading(data: {
    tenant: { connect: { id: string } };
    blowerConfig: { connect: { id: string } };
    psi: number;
    isAlert: boolean;
    deviceTs?: number;
    deviceTime?: Date;
    source?: string;
  }) {
    const { deviceTs, deviceTime, source, ...rest } = data;
    return this.prisma.pressureReading.create({
      data: {
        ...rest,
        ...(deviceTs !== undefined ? { deviceTs } : {}),
        ...(deviceTime !== undefined ? { deviceTime } : {}),
        ...(source !== undefined ? { source } : {}),
      },
    });
  }

  async createManyReadings(
    data: {
      tenantId: string;
      blowerConfigId: string;
      psi: number;
      isAlert: boolean;
      deviceTs?: number;
      deviceTime?: Date;
      source?: string;
    }[],
  ) {
    if (data.length === 0) return;
    return this.prisma.pressureReading.createMany({
      data: data.map((r) => ({
        tenantId: r.tenantId,
        blowerConfigId: r.blowerConfigId,
        psi: r.psi,
        isAlert: r.isAlert,
        ...(r.deviceTs !== undefined ? { deviceTs: r.deviceTs } : {}),
        ...(r.deviceTime !== undefined ? { deviceTime: r.deviceTime } : {}),
        ...(r.source !== undefined ? { source: r.source } : {}),
      })),
    });
  }

  async getAlertState(blowerConfigId: string) {
    const config = await this.prisma.blowerConfig.findUnique({
      where: { id: blowerConfigId },
      select: {
        lastSaveAt: true,
        lastAlertState: true,
      },
    });
    return {
      lastSaveAt: config?.lastSaveAt?.getTime() ?? 0,
      lastAlertState: config?.lastAlertState ?? false,
    };
  }

  async updateAlertState(
    blowerConfigId: string,
    lastSaveAt: Date,
    lastAlertState: boolean,
  ) {
    return this.prisma.blowerConfig.update({
      where: { id: blowerConfigId },
      data: { lastSaveAt, lastAlertState },
    });
  }

  async findPressureReadingsForChart(
    tenantId: string,
    blowerConfigId?: string,
    from?: Date,
    to?: Date,
  ) {
    return this.prisma.pressureReading.findMany({
      where: {
        tenantId,
        ...(blowerConfigId && { blowerConfigId }),
        ...(from || to
          ? {
              createdAt: {
                ...(from && { gte: from }),
                ...(to && { lte: to }),
              },
            }
          : {}),
      },
      select: {
        psi: true,
        isAlert: true,
        createdAt: true,
        blowerConfig: {
          select: {
            blowerId: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}