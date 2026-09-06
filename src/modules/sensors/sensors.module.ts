import { Module } from '@nestjs/common';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';
import { SensorsGateway } from './sensors.gateway';
import { SensorsRepository } from './repositories/sensors.repository';
import { DeviceTimeService } from './services/device-time.service';
import { IotModule } from '../iot/iot.module';

@Module({
  imports: [IotModule],
  controllers: [SensorsController],
  providers: [
    SensorsGateway,
    SensorsService,
    SensorsRepository,
    DeviceTimeService,
  ],
  exports: [SensorsService],
})
export class SensorsModule {}