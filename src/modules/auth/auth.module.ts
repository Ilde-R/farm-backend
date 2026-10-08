import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthRepository } from './repositories/auth.repository';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { envs } from '../../config';
import { ThrottlerModule } from '@nestjs/throttler';
import { SpanishThrottlerGuard } from './guards/spanish-throttler.guard';

@Module({
  imports: [
    UsersModule,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 10 }],
    }),
    JwtModule.register({
      global: true,
      secret: envs.jwtSecret,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [AuthService, AuthRepository, SpanishThrottlerGuard],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
