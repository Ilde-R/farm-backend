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

  async findCredentialByUserId(userId: string) {
    return this.prisma.credential.findUnique({
      where: { userId },
    });
  }

  async updateCredentialPassword(userId: string, hashedPassword: string) {
    return this.prisma.credential.update({
      where: { userId },
      data: { password: hashedPassword },
    });
  }

  async updateProfile(
    userId: string,
    data: { username?: string; email?: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: userSelect,
    });
  }

  async deleteUserWithTenant(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        tenantId: true,
      },
    });

    if (!user) return null;

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return {
      deletedUserId: userId,
      deletedTenantId: user.tenantId,
    };
  }
}
