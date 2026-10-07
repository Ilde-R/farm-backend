import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { BatchRepository } from './repositories/batch.repository';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class BatchesService {
  constructor(private readonly batchRepository: BatchRepository) {
  }

  async create(createBatchDto: CreateBatchDto, tenantId: string) {
    const batch = await this.batchRepository.create(
      createBatchDto,
      tenantId,
    );

    if (!batch) {
      throw new NotFoundException('Tanque no encontrado o no autorizado');
    }

    return batch;
  }

  findAll(pagination: PaginationQueryDto, tenantId: string) {
    return this.batchRepository.findAll(pagination, tenantId);
  }

  async findOne(id: string, tenantId: string) {
    const batch = await this.batchRepository.findOne(id, tenantId);

    if (!batch) {
      throw new NotFoundException('Lote no encontrado o no autorizado');
    }

    return batch;
  }

  async update(id: string, updateBatchDto: UpdateBatchDto, tenantId: string) {
    const batch = await this.batchRepository.update(
      id,
      updateBatchDto,
      tenantId,
    );

    if (!batch) {
      throw new NotFoundException('Lote o tanque no encontrado o no autorizado');
    }

    return batch;
  }

  async remove(id: string, tenantId: string): Promise<{ message: string }> {
    const removed = await this.batchRepository.remove(id, tenantId);

    if (!removed) {
      throw new NotFoundException('Lote no encontrado o no autorizado');
    }

    return { message: 'Lote eliminado con éxito' };
  }
}
