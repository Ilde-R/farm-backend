import { BadRequestException } from '@nestjs/common';
import { MovementType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockOutflowDto } from './dto/create-stock-outflow.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TankMovementsRepository } from './tank-movements.repository';

describe('TankMovementsRepository', () => {
  const sourceBatch = {
    id: 'source-batch',
    tankId: 'source-tank',
    currentQuantity: 100,
    stockingDate: new Date('2026-01-01T00:00:00.000Z'),
    batchesStatus: 'isActive',
  };

  const createDto: CreateTransferDto = {
    batchId: sourceBatch.id,
    destinationTankId: 'destination-tank',
    quantity: 50,
    movementDate: new Date('2026-02-01T00:00:00.000Z'),
  };

  function createRepository(
    currentQuantity = 100,
    destinationBatch: { id: string } | null = null,
  ) {
    const transaction = {
      $queryRaw: jest
        .fn()
        .mockResolvedValue([
          { id: 'source-tank' },
          { id: 'destination-tank' },
        ]),
      batch: {
        findFirst: jest.fn((args: { where: { id?: string } }) =>
          args.where.id
            ? Promise.resolve({ ...sourceBatch, currentQuantity })
            : Promise.resolve(destinationBatch),
        ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({ id: destinationBatch?.id }),
        create: jest.fn().mockResolvedValue({ id: 'destination-batch' }),
      },
      tank: {
        update: jest.fn().mockResolvedValue({}),
      },
      tankMovement: {
        create: jest.fn().mockResolvedValue({ id: 'movement' }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
      tankMovement: {
        findMany: jest.fn(),
      },
    };

    return {
      repository: new TankMovementsRepository(
        prisma as unknown as PrismaService,
      ),
      transaction,
    };
  }

  it('creates a destination batch when the destination has no active batch', async () => {
    const { repository, transaction } = createRepository();

    await repository.createTransfer(createDto, 'tenant-id');

    expect(transaction.batch.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          currentQuantity: { gte: 50 },
        }),
        data: { currentQuantity: { decrement: 50 } },
      }),
    );
    expect(transaction.batch.create).toHaveBeenCalledWith({
      data: {
        tankId: 'destination-tank',
        stockingDate: sourceBatch.stockingDate,
        initialQuantity: 50,
        currentQuantity: 50,
      },
      select: { id: true },
    });
    expect(transaction.tankMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          batchId: 'source-batch',
          destinationBatchId: 'destination-batch',
          sourceTankId: 'source-tank',
          destinationTankId: 'destination-tank',
          quantity: 50,
        }),
      }),
    );
    expect(transaction.tank.update).toHaveBeenCalledWith({
      where: { id: 'destination-tank' },
      data: { tankStatus: 'isActive' },
    });
  });

  it('adds transferred quantity to the active destination batch without changing its initial quantity', async () => {
    const activeDestinationBatch = { id: 'existing-destination-batch' };
    const { repository, transaction } = createRepository(
      100,
      activeDestinationBatch,
    );

    await repository.createTransfer(createDto, 'tenant-id');

    expect(transaction.batch.update).toHaveBeenCalledWith({
      where: { id: activeDestinationBatch.id },
      data: { currentQuantity: { increment: 50 } },
      select: { id: true },
    });
    expect(transaction.batch.create).not.toHaveBeenCalled();
    expect(transaction.tankMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          destinationBatchId: activeDestinationBatch.id,
        }),
      }),
    );
  });

  it('rejects a transfer larger than the available batch quantity', async () => {
    const { repository, transaction } = createRepository(25);

    await expect(
      repository.createTransfer(createDto, 'tenant-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.batch.updateMany).not.toHaveBeenCalled();
    expect(transaction.batch.create).not.toHaveBeenCalled();
  });

  it.each([MovementType.mortality, MovementType.sale])(
    'decrements the batch and records a %s outflow',
    async (movementType) => {
      const { repository, transaction } = createRepository();
      const outflow: CreateStockOutflowDto = {
        batchId: sourceBatch.id,
        movementType,
        quantity: 5,
        movementDate: new Date('2026-02-02T00:00:00.000Z'),
      };

      await repository.createStockOutflow(outflow, 'tenant-id');

      expect(transaction.batch.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            currentQuantity: { gte: 5 },
          }),
          data: { currentQuantity: { decrement: 5 } },
        }),
      );
      expect(transaction.tankMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            batchId: sourceBatch.id,
            sourceTankId: sourceBatch.tankId,
            movementType,
            quantity: 5,
          }),
        }),
      );
    },
  );
});
