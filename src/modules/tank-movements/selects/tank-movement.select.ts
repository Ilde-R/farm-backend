import { Prisma } from '@prisma/client';

export const tankMovementSelect = {
  id: true,
  batchId: true,
  destinationBatchId: true,
  sourceTankId: true,
  destinationTankId: true,
  movementType: true,
  quantity: true,
  notes: true,
  movementDate: true,
  createdAt: true,
  sourceTank: {
    select: {
      id: true,
      tankNumber: true,
    },
  },
  destinationTank: {
    select: {
      id: true,
      tankNumber: true,
    },
  },
  batch: {
    select: {
      id: true,
      stockingDate: true,
    },
  },
  destinationBatch: {
    select: {
      id: true,
      stockingDate: true,
    },
  },
} satisfies Prisma.TankMovementSelect;

export type TankMovementSelect = Prisma.TankMovementGetPayload<{
  select: typeof tankMovementSelect;
}>;
