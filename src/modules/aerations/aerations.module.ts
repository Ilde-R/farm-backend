import { Module } from '@nestjs/common';
import { DeviceTimeService } from './services/device-time.service';
import { WsConnectionManager } from './websockets/ws-connection.manager';
import { AerationsController } from './aerations.controller';
import { AerationsGateway } from './websockets/aerations.gateway';
import { AerationsRepository } from './repositories/aeration.repository';
import { AerationsEventListener } from './aerations.listener';
import { AerationsService } from './services/aeration.service';

@Module({
  imports: [],
  controllers: [AerationsController],
  providers: [
    AerationsGateway,
    AerationsService,
    AerationsRepository,
    DeviceTimeService,
    WsConnectionManager,
    AerationsEventListener,
  ],
  exports: [AerationsService],
})
export class AerationsModule {}