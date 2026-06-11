import { Prisma } from "@prisma/client";
export declare const authSelect: {
    id: true;
    username: true;
    email: true;
};
export type AuthSelect = Prisma.UserGetPayload<{
    select: typeof authSelect;
}>;
