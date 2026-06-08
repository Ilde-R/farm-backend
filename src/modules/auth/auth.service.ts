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
    const exist = await this.authRepository.findUsername(registerDto.email);

    if (exist) throw new ConflictException('Email ready exists');

    const hashed = await bcrypt.hash(registerDto.password, 10);
    return this.authRepository.register({
      ...registerDto,
      password: hashed,
    });
  }

  async login(loginDto: LoginDto) {
    const user = await this.authRepository.findUsername(loginDto.email);
    if (!user) throw new UnauthorizedException('Credentials not valid');

    const valid = await bcrypt.compare(loginDto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credentials not valid');

    const refreshToken = randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.authRepository.createSession(user.id, refreshToken, expiresAt);

    const payload = { sub: user.id, email: user.email };
    return {
      id: user.id,
      username: user.username,
      email: user.email,
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

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const payload = { sub: user.id, email: user.email };
    return { access_token: this.jwtService.sign(payload) };
  }

  async logout(userId: string) {
    await this.authRepository.invalidateAllUserSessions(userId);
    return { message: 'Logged out successfully' };
  }
}
