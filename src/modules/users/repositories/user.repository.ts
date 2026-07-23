import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseRepository } from '../../../common/abstracts/base.repository';
import { User } from '@prisma/client';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { userSelect } from '../selects/user.select';

@Injectable()
export class UserRepository extends BaseRepository<
  User,
  CreateUserDto,
  UpdateUserDto
> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.user, userSelect);
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: userSelect,
    });
  }

  async findByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: userSelect,
    });
  }
}
