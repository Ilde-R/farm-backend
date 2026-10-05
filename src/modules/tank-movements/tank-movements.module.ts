import { Module } from '@nestjs/common';
import { TankMovementsController } from './tank-movements.controller';
import { TankMovementsRepository } from './tank-movements.repository';
import { TankMovementsService } from './tank-movements.service';

@Module({
  controllers: [TankMovementsController],
  providers: [TankMovementsService, TankMovementsRepository],
})
export class TankMovementsModule {}
