import { UsersService } from './users.service';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(req: RequestWithUser): Promise<{
        id: string;
        username: string;
        email: string;
    }[]>;
    getProfile(req: RequestWithUser): Promise<{
        id: string;
        tenantId: string | null;
        username: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(req: RequestWithUser, updateProflileDto: UpdateProfileDto): Promise<{
        id: string;
        username: string;
        email: string;
    }>;
    changePassword(req: RequestWithUser, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    deleteAccount(req: RequestWithUser): Promise<{
        message: string;
        deletedUserId: string;
        deletedTenantId: string | null;
    }>;
}
