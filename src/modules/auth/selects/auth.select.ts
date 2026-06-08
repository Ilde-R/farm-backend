import { Prisma } from "@prisma/client";

export const authSelect = {
  id: true,
  username: true,
  email: true,
} satisfies Prisma.UserSelect;

export type AuthSelect = Prisma.UserGetPayload<{
  select: typeof authSelect;
}>;
