import { Prisma } from '@prisma/client';
export declare const userSelect: {
    id: true;
    username: true;
    email: true;
};
export type UserSelect = Prisma.UserGetPayload<{
    select: typeof userSelect;
}>;
