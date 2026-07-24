import { NotFoundException } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

export abstract class BaseService<T, CreateDto, UpdateDto> {
  constructor(
    protected readonly userRepository: BaseRepository<T, CreateDto, UpdateDto>,
  ) {}

  async create(createDto: CreateDto): Promise<T> {
    return this.userRepository.create(createDto);
  }

  async findAll(pagination: PaginationQueryDto) {
    return this.userRepository.findAll(pagination);
  }

  async findOne(id: string): Promise<T> {
    const record = await this.userRepository.findOne(id);

    if (!record) {
      throw new NotFoundException();
    }

    return record;
  }

  async update(id: string, updateDto: UpdateDto): Promise<T> {
    await this.findOne(id);

    return this.userRepository.update(id, updateDto);
  }

  async remove(id: string): Promise<T> {
    await this.findOne(id);

    return this.userRepository.remove(id);
  }
}
