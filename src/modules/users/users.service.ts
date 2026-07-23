import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './repositories/user.repository';
import { BaseService } from '../../common/abstracts/base.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class UsersService extends BaseService<
  any,
  CreateUserDto,
  UpdateUserDto
> {
  constructor(protected readonly repository: UserRepository) {
    super(repository);
  }

  async findByTenant(tenantId: string) {
    return this.repository.findByTenant(tenantId);
  }

  async getProfile(userId: string) {
    const user = await this.repository.findOne(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }
}
