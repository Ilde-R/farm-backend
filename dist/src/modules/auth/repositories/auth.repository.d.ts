import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
export declare class AuthRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    register(data: Prisma.UserCreateInput): Promise<{
        id: string;
        username: string;
        email: string;
    }>;
    findUsername(email: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        username: string;
        email: string;
        password: string;
    } | null>;
    createSession(userId: string, refreshToken: string, expiresAt: Date): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        userId: string;
        refreshToken: string;
        expiresAt: Date | null;
        lastUsedAt: Date;
    }>;
    findSession(refreshToken: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        userId: string;
        refreshToken: string;
        expiresAt: Date | null;
        lastUsedAt: Date;
    } | null>;
    invalidateSession(refreshToken: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        userId: string;
        refreshToken: string;
        expiresAt: Date | null;
        lastUsedAt: Date;
    }>;
    invalidateAllUserSessions(userId: string): Promise<Prisma.BatchPayload>;
}
