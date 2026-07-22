import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/abstracts/base.repository';
import { CreateSensorDto } from '../dto/create-sensor.dto';
import { UpdateSensorDto } from '../dto/update-sensor.dto';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SensorsRepository extends BaseRepository<
  any,
  CreateSensorDto,
  UpdateSensorDto
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

  async createReading(data: any) {
    return this.prisma.pressureReading.create({ data });
  }
}
