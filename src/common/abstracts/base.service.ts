import { NotFoundException } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

export abstract class BaseService<T, CreateDto, UpdateDto> {
  constructor(
    protected readonly repository: BaseRepository<T, CreateDto, UpdateDto>,
  ) {}

  async create(createDto: CreateDto): Promise<T> {
    return this.repository.create(createDto);
  }

  async findAll(pagination: PaginationQueryDto) {
    return this.repository.findAll(pagination);
  }

  async findOne(id: string): Promise<T> {
    const record = await this.repository.findOne(id);

    if (!record) {
      throw new NotFoundException();
    }

    return record;
  }

  async update(id: string, updateDto: UpdateDto): Promise<T> {
    await this.findOne(id);

    return this.repository.update(id, updateDto);
  }

  async remove(id: string): Promise<T> {
    await this.findOne(id);

    return this.repository.remove(id);
  }
}
