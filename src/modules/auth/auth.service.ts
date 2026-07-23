import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { AuthRepository } from './repositories/auth.repository';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async register(registerDto: RegisterDto) {
    const exist = await this.authRepository.findForLogin(registerDto.email);

    if (exist) throw new ConflictException('Email already exists');

    const salt = await bcrypt.genSalt();
    const { password, ...userData } = registerDto;
    const hash = await bcrypt.hash(password, salt);

    const tenant = await this.prisma.tenant.create({
      data: { name: registerDto.username },
    });

    const user = await this.authRepository.register(
      { ...userData, tenant: { connect: { id: tenant.id } } },
      hash,
    );

    const refreshToken = randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.authRepository.createSession(user.id, refreshToken, expiresAt);

    const payload = { sub: user.id, email: user.email, tenantId: tenant.id };
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      tenantId: tenant.id,
      access_token: this.jwtService.sign(payload),
      refresh_token: refreshToken,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.authRepository.findForLogin(loginDto.email);
    if (!user || !user.credential)
      throw new UnauthorizedException('Credentials not valid');

    const valid = await bcrypt.compare(
      loginDto.password,
      user.credential.password,
    );
    if (!valid) throw new UnauthorizedException('Credentials not valid');

    let tenantId = user.tenantId;
    if (!tenantId) {
      const tenant = await this.prisma.tenant.create({
        data: { name: user.username },
      });
      await this.prisma.user.update({
        where: { id: user.id },
        data: { tenantId: tenant.id },
      });
      tenantId = tenant.id;
    }

    const refreshToken = randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.authRepository.createSession(user.id, refreshToken, expiresAt);

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId,
    };
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      tenantId,
      access_token: this.jwtService.sign(payload),
      refresh_token: refreshToken,
    };
  }

  async refresh(refreshToken: RefreshTokenDto) {
    const session = await this.authRepository.findSession(
      refreshToken.refreshToken,
    );

    if (
      !session ||
      !session.isActive ||
      (session.expiresAt && session.expiresAt < new Date())
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.authRepository.invalidateSession(refreshToken.refreshToken);

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) throw new UnauthorizedException('User not found');

    let tenantId = user.tenantId;
    if (!tenantId) {
      const tenant = await this.prisma.tenant.create({
        data: { name: user.username },
      });
      await this.prisma.user.update({
        where: { id: user.id },
        data: { tenantId: tenant.id },
      });
      tenantId = tenant.id;
    }

    const newRefreshToken = randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.authRepository.createSession(
      user.id,
      newRefreshToken,
      expiresAt,
    );

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId,
    };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: newRefreshToken,
    };
  }

  async logout(userId: string) {
    await this.authRepository.invalidateAllUserSessions(userId);
    return { message: 'Logged out successfully' };
  }
}
