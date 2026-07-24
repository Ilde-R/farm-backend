import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './repositories/user.repository';
import { BaseService } from '../../common/abstracts/base.service';
export declare class UsersService extends BaseService<any, CreateUserDto, UpdateUserDto> {
    protected readonly repository: UserRepository;
    constructor(repository: UserRepository);
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
}
