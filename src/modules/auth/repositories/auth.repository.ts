import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async register(
    userData: Omit<Prisma.UserCreateInput, 'credential'>,
    passwordHash: string,
  ) {
    return this.prisma.user.create({
      data: {
        ...userData,
        credential: {
          create: {
            password: passwordHash,
          },
        },
      },
    });
  }

  async findForLogin(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        credential: true,
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
