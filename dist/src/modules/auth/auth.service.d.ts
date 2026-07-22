import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { AuthRepository } from './repositories/auth.repository';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { PrismaService } from '../../prisma/prisma.service';
export declare class AuthService {
    private readonly authRepository;
    private readonly jwtService;
    private readonly prisma;
    constructor(authRepository: AuthRepository, jwtService: JwtService, prisma: PrismaService);
    register(registerDto: RegisterDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        tenantId: string | null;
        username: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        id: string;
        username: string;
        email: string;
        access_token: string;
        refresh_token: string;
    }>;
    refresh(refreshToken: RefreshTokenDto): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    logout(userId: string): Promise<{
        message: string;
    }>;
}
