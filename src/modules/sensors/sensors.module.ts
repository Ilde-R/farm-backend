import { Module } from '@nestjs/common';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';
import { SensorsGateway } from './websockets/sensors.gateway';
import { SensorsRepository } from './repositories/sensors.repository';
import { DeviceTimeService } from './services/device-time.service';
import { IotModule } from '../iot/iot.module';
import { WsConnectionManager } from './websockets/ws-connection.manager';
import { SensorsEventListener } from './sensors.listener';

@Module({
  imports: [IotModule],
  controllers: [SensorsController],
  providers: [
    SensorsGateway,
    SensorsService,
    SensorsRepository,
    DeviceTimeService,
    WsConnectionManager,
    SensorsEventListener,
  ],
  exports: [SensorsService],
})
export class SensorsModule {}