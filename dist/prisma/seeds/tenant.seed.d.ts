import { PrismaClient } from '@prisma/client';
export declare const MAIN_TENANT_ID = "11111111-1111-1111-1111-111111111111";
export declare function seedTenants(prisma: PrismaClient): Promise<void>;
