import { Module } from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { SensorsGateway } from './sensors.gateway';
import { SensorsRepository } from './repositories/sensors.repository';
import { IotModule } from '../iot/iot.module';

@Module({
  imports: [IotModule],
  providers: [SensorsGateway, SensorsService, SensorsRepository],
})
export class SensorsModule {}
