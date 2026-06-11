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

  async getLatestReading() {
    return this.prisma.pressureReading.findFirst({
      orderBy: { createdAt: 'desc' },
    });
  }
}
