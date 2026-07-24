import { PrismaService } from '../../../prisma/prisma.service';
import { BaseRepository } from '../../../common/abstracts/base.repository';
import { User } from '@prisma/client';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
export declare class UserRepository extends BaseRepository<User, CreateUserDto, UpdateUserDto> {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): Promise<{
        id: string;
        username: string;
        email: string;
    } | null>;
    findByTenant(tenantId: string): Promise<{
        id: string;
        username: string;
        email: string;
    }[]>;
    findCredentialByUserId(userId: string): Promise<{
        id: string;
        userId: string;
        password: string;
    } | null>;
    updateCredentialPassword(userId: string, hashedPassword: string): Promise<{
        id: string;
        userId: string;
        password: string;
    }>;
    updateProfile(userId: string, data: {
        username?: string;
        email?: string;
    }): Promise<{
        id: string;
        username: string;
        email: string;
    }>;
    deleteUserWithTenant(userId: string): Promise<{
        deletedUserId: string;
        deletedTenantId: string | null;
    } | null>;
}
