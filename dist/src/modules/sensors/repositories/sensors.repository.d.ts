import { BaseRepository } from '../../../common/abstracts/base.repository';
import { CreateSensorDto } from '../dto/create-sensor.dto';
import { UpdateSensorDto } from '../dto/update-sensor.dto';
import { PrismaService } from '../../../prisma/prisma.service';
export declare class SensorsRepository extends BaseRepository<any, CreateSensorDto, UpdateSensorDto> {
    private readonly prisma;
    constructor(prisma: PrismaService);
}
