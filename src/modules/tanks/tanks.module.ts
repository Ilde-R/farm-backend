import { Module } from '@nestjs/common';
import { TanksService } from './tanks.service';
import { TanksController } from './tanks.controller';
import { TankRepository } from './repositories/tank.repository';

@Module({
  controllers: [TanksController],
  providers: [TanksService, TankRepository],
})
export class TanksModule {}
