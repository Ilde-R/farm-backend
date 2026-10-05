import { Module } from '@nestjs/common';
import { BatchesService } from './batches.service';
import { BatchesController } from './batches.controller';
import { BatchRepository } from './repositories/batch.repository';

@Module({
  controllers: [BatchesController],
  providers: [BatchesService, BatchRepository],
})
export class BatchesModule {}
