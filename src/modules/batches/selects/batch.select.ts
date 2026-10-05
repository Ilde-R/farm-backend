import { Prisma } from '@prisma/client';

export const batchSelect = {
  id: true,
  tankId: true,
  stockingDate: true,
  initialQuantity: true,
  currentQuantity: true,
  harvestedDate: true,
  batchesStatus: true,
  createdAt: true,
  tank: {
    select: {
      id: true,
      tankNumber: true,
    },
  },
} satisfies Prisma.BatchSelect;

export type BatchSelect = Prisma.BatchGetPayload<{
  select: typeof batchSelect;
}>;
