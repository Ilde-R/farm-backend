import { Module } from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { SensorsGateway } from './sensors.gateway';
import { SensorsRepository } from './repositories/sensors.repository';

@Module({
  providers: [SensorsGateway, SensorsService, SensorsRepository],
})
export class SensorsModule {}
