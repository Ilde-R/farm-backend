import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { authSelect } from '../selects/auth.select';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async register(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({
      data,
      select: authSelect,
    });
  }

  async findUsername(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async createSession(userId: string, refreshToken: string, expiresAt: Date) {
    return await this.prisma.session.create({
      data: { userId, refreshToken, expiresAt },
    });
  }

  async findSession(refreshToken: string) {
    return this.prisma.session.findUnique({ where: { refreshToken } });
  }

  async invalidateSession(refreshToken: string) {
    return this.prisma.session.update({
      where: { refreshToken },
      data: { isActive: false },
    });
  }

  async invalidateAllUserSessions(userId: string) {
    return this.prisma.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
  }
}
