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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        tenantId: string | null;
        username: string;
    }>;
    updateProfile(req: RequestWithUser, updateProflileDto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        username: string;
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
