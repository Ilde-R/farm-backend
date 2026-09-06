import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/abstracts/base.repository';
import { CreateSensorDto } from '../dto/create-sensor.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, PressureReading } from '@prisma/client';

@Injectable()
export class SensorsRepository extends BaseRepository<
  PressureReading,
  CreateSensorDto,
  Partial<PressureReading>
> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.pressureReading);
  }

  async upsertBlowerConfig(
    tenantId: string,
    blowerId: string,
    currentThreshold?: number,
  ) {
    return this.prisma.blowerConfig.upsert({
      where: {
        tenantId_blowerId: {
          tenantId,
          blowerId,
        },
      },
      update: {},
      create: {
        blowerId,
        tenant: { connect: { id: tenantId } },
        currentThreshold: currentThreshold ?? 2.0,
      },
    });
  }

  async updateBlowerThreshold(blowerConfigId: string, threshold: number) {
    return this.prisma.blowerConfig.update({
      where: { id: blowerConfigId },
      data: { currentThreshold: threshold },
    });
  }

  async getBlowerConfig(tenantId: string, blowerId: string) {
    return this.prisma.blowerConfig.findUnique({
      where: {
        tenantId_blowerId: {
          tenantId,
          blowerId,
        },
      },
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

  async updateDeviceMetadata(
    blowerConfigId: string,
    data: {
      firmwareVersion?: string;
      wifiRssi?: number;
      uptimeMs?: number;
      freeHeap?: number;
    },
  ) {
    const updateData: Prisma.BlowerConfigUpdateInput = {
      firmwareVersion: data.firmwareVersion,
      wifiRssi: data.wifiRssi,
      uptimeMs: data.uptimeMs,
      freeHeap: data.freeHeap,
    };

    return this.prisma.blowerConfig.update({
      where: { id: blowerConfigId },
      data: updateData,
    });
  }

  async updateDeviceConfig(
    blowerConfigId: string,
    data: {
      readIntervalMs?: number;
      scaleFactor?: number;
    },
  ) {
    return this.prisma.blowerConfig.update({
      where: { id: blowerConfigId },
      data,
    });
  }

  async getBlowerConfigById(blowerConfigId: string) {
    return this.prisma.blowerConfig.findUnique({
      where: { id: blowerConfigId },
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

  async getAlertState(blowerConfigId: string) {
    const config = await this.prisma.blowerConfig.findUnique({
      where: {
        id: blowerConfigId,
      },
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
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
