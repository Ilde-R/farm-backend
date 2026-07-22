import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { RequestWithUser } from './interfaces/request-with-user.interface';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto): Promise<{
        id: string;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        username: string;
        email: string;
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
    logout(req: RequestWithUser): Promise<{
        message: string;
    }>;
}
