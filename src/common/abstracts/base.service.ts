import { NotFoundException } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

export abstract class BaseService<T, CreateDto, UpdateDto> {
  constructor(
    protected readonly repository: BaseRepository<T, CreateDto, UpdateDto>,
  ) {}

  async create(createDto: CreateDto, tenantId: string): Promise<T> {
    return this.repository.create({ ...createDto, tenantId } as unknown as CreateDto);
  }

  async findAll(pagination: PaginationQueryDto, tenantId: string) {
    return this.repository.findAll({ ...pagination, tenantId });
  }

  async findOne(id: string, tenantId: string): Promise<T> {
    const record = await this.repository.findOne(id, tenantId);

    if (!record) {
      throw new NotFoundException('Registro no encontrado o no autorizado');
    }

    return record;
  }

  async update(id: string, updateDto: UpdateDto, tenantId: string): Promise<T> {
    try {
      return await this.repository.update(id, tenantId, updateDto);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundException();
      }
      throw error;
    }
  }

  async remove(id: string, tenantId: string): Promise<void> {
    try {
      await this.findOne(id, tenantId);
      await this.repository.remove(id, tenantId);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundException('Registro no encontrado o no autorizado');
      }
      throw error;
    }
  }
}
