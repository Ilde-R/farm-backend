import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthRepository } from './repositories/auth.repository';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { envs } from '../../config';

@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      global: true,
      secret: envs.jwtSecret,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [AuthService, AuthRepository],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
