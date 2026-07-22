import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
export declare class AuthRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    register(userData: Omit<Prisma.UserCreateInput, 'credential'>, passwordHash: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        tenantId: string | null;
        username: string;
    }>;
    findForLogin(email: string): Promise<({
        credential: {
            id: string;
            password: string;
            userId: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        tenantId: string | null;
        username: string;
    }) | null>;
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
