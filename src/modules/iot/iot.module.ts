import { Module } from '@nestjs/common';
import { IotService } from './iot.service';
import { IotController } from './iot.controller';
import { IotRepository } from './repositories/iot.repository';

@Module({
  controllers: [IotController],
  providers: [IotService, IotRepository],
  exports: [IotService],
})
export class IotModule {}
