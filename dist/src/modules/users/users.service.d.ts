import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './repositories/user.repository';
import { BaseService } from '../../common/abstracts/base.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class UsersService extends BaseService<any, CreateUserDto, UpdateUserDto> {
    protected readonly userRepository: UserRepository;
    constructor(userRepository: UserRepository);
    findByTenant(tenantId: string): Promise<{
        id: string;
        email: string;
        username: string;
    }[]>;
    getProfile(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        tenantId: string | null;
        username: string;
    }>;
    updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        username: string;
    }>;
    changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    deleteAccount(userId: string): Promise<{
        message: string;
        deletedUserId: string;
        deletedTenantId: string | null;
    }>;
}
