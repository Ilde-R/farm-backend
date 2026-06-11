import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/abstracts/base.repository';
import { CreateSensorDto } from '../dto/create-sensor.dto';
import { UpdateSensorDto } from '../dto/update-sensor.dto';
import { PrismaService } from '../../../prisma/prisma.service';
// import { defaultSensorSelect } from '../selects/sensor.selects';

@Injectable()
export class SensorsRepository extends BaseRepository<
  any,
  CreateSensorDto,
  UpdateSensorDto
> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.pressureReading);
  }

  async upsertBlowerConfig(tenantId: string, blowerId: string, currentThreshold?: number) {
    const updateData: any = {};
    if (currentThreshold !== undefined) {
      updateData.currentThreshold = currentThreshold;
    }

    return this.prisma.blowerConfig.upsert({
      where: { blowerId },
      update: updateData,
      create: {
        blowerId,
        tenant: { connect: { id: tenantId } },
        currentThreshold: currentThreshold ?? 2.0,
      },
    });
  }

  async getBlowerConfig(blowerId: string) {
    return this.prisma.blowerConfig.findUnique({
      where: { blowerId },
    });
  }

  async getFirstBlowerConfig() {
    return this.prisma.blowerConfig.findFirst();
  }

  async createReading(data: any) {
    return this.prisma.pressureReading.create({ data });
  }
}
