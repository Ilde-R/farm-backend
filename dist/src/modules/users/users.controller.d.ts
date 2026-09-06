import { UsersService } from './users.service';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(req: RequestWithUser, pagination: PaginationQueryDto): Promise<{
        items: any;
        total: any;
    }>;
    getProfile(req: RequestWithUser): Promise<{
        tenantId: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        username: string;
        email: string;
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
