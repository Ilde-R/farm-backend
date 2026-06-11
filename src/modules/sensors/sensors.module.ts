import { Module } from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { SensorsGateway } from './sensors.gateway';
import { SensorsController } from './sensors.controller';
import { SensorsRepository } from './repositories/sensors.repository';

@Module({
  controllers: [SensorsController],
  providers: [SensorsGateway, SensorsService, SensorsRepository],
})
export class SensorsModule {}
