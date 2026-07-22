import { Prisma } from '@prisma/client';

export const userSelect = {
  id: true,
  username: true,
  email: true,
} satisfies Prisma.UserSelect;

export type UserSelect = Prisma.UserGetPayload<{
  select: typeof userSelect;
}>;
