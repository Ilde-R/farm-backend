import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockOutflowDto } from './dto/create-stock-outflow.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TankMovementsQueryDto } from './dto/tank-movements-query.dto';
import {
  tankMovementSelect,
  TankMovementSelect,
} from './selects/tank-movement.select';

@Injectable()
export class TankMovementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createTransfer(
    data: CreateTransferDto,
    tenantId: string,
  ): Promise<TankMovementSelect> {
    return this.prisma.$transaction(async (transaction) => {
      const sourceBatch = await transaction.batch.findFirst({
        where: {
          id: data.batchId,
          batchesStatus: 'isActive',
          tank: { is: { tenantId, deletedAt: null } },
        },
        select: {
          id: true,
          tankId: true,
          currentQuantity: true,
          stockingDate: true,
        },
      });

      if (!sourceBatch?.tankId) {
        throw new NotFoundException(
          'Lote origen no encontrado o no autorizado',
        );
      }

      if (sourceBatch.tankId === data.destinationTankId) {
        throw new BadRequestException(
          'El tanque de origen y destino deben ser diferentes',
        );
      }

      const lockedTanks = await transaction.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM tanks
        WHERE id IN (${sourceBatch.tankId}::uuid, ${data.destinationTankId}::uuid)
          AND "tenantId" = ${tenantId}::uuid
          AND "deletedAt" IS NULL
        ORDER BY id
        FOR UPDATE
      `;

      if (lockedTanks.length !== 2) {
        throw new NotFoundException(
          'Tanque origen o destino no encontrado o no autorizado',
        );
      }

      if (sourceBatch.currentQuantity < data.quantity) {
        throw new BadRequestException(
          'La cantidad transferida excede la cantidad disponible del lote',
        );
      }

      const updateResult = await transaction.batch.updateMany({
        where: {
          id: sourceBatch.id,
          tankId: sourceBatch.tankId,
          batchesStatus: 'isActive',
          currentQuantity: { gte: data.quantity },
        },
        data: {
          currentQuantity: { decrement: data.quantity },
        },
      });

      if (updateResult.count !== 1) {
        throw new ConflictException(
          'La cantidad disponible cambió; vuelve a consultar el lote e intenta de nuevo',
        );
      }

      const existingDestinationBatch = await transaction.batch.findFirst({
        where: {
          tankId: data.destinationTankId,
          batchesStatus: 'isActive',
        },
        select: { id: true },
      });

      const destinationBatch = existingDestinationBatch
        ? await transaction.batch.update({
            where: { id: existingDestinationBatch.id },
            data: { currentQuantity: { increment: data.quantity } },
            select: { id: true },
          })
        : await transaction.batch.create({
            data: {
              tankId: data.destinationTankId,
              stockingDate: sourceBatch.stockingDate,
              initialQuantity: data.quantity,
              currentQuantity: data.quantity,
            },
            select: { id: true },
          });

      await transaction.tank.update({
        where: { id: data.destinationTankId },
        data: { tankStatus: 'isActive' },
      });

      return transaction.tankMovement.create({
        data: {
          batchId: sourceBatch.id,
          destinationBatchId: destinationBatch.id,
          sourceTankId: sourceBatch.tankId,
          destinationTankId: data.destinationTankId,
          movementType: 'transfer',
          quantity: data.quantity,
          movementDate: data.movementDate,
          notes: data.notes,
        },
        select: tankMovementSelect,
      });
    });
  }

  async createStockOutflow(
    data: CreateStockOutflowDto,
    tenantId: string,
  ): Promise<TankMovementSelect> {
    return this.prisma.$transaction(async (transaction) => {
      const batch = await transaction.batch.findFirst({
        where: {
          id: data.batchId,
          tank: { is: { tenantId, deletedAt: null } },
        },
        select: {
          id: true,
          tankId: true,
          currentQuantity: true,
        },
      });

      if (!batch?.tankId) {
        throw new NotFoundException('Lote no encontrado o no autorizado');
      }

      if (batch.currentQuantity < data.quantity) {
        throw new BadRequestException(
          'La cantidad registrada excede la cantidad disponible del lote',
        );
      }

      const updateResult = await transaction.batch.updateMany({
        where: {
          id: batch.id,
          tankId: batch.tankId,
          currentQuantity: { gte: data.quantity },
        },
        data: {
          currentQuantity: { decrement: data.quantity },
        },
      });

      if (updateResult.count !== 1) {
        throw new ConflictException(
          'La cantidad disponible cambió; vuelve a consultar el lote e intenta de nuevo',
        );
      }

      return transaction.tankMovement.create({
        data: {
          batchId: batch.id,
          sourceTankId: batch.tankId,
          movementType: data.movementType,
          quantity: data.quantity,
          movementDate: data.movementDate,
          notes: data.notes,
        },
        select: tankMovementSelect,
      });
    });
  }

  async findForTank(
    tankId: string,
    query: TankMovementsQueryDto,
    tenantId: string,
  ) {
    const tank = await this.prisma.tank.findFirst({
      where: { id: tankId, tenantId },
      select: {
        id: true,
        tankNumber: true,
      },
    });

    if (!tank) {
      throw new NotFoundException('Tanque no encontrado o no autorizado');
    }

    const movementDate =
      query.from && query.to
        ? { gte: query.from, lt: query.to }
        : query.from
          ? { gte: query.from }
          : query.to
            ? { lt: query.to }
            : undefined;

    const movements = await this.prisma.tankMovement.findMany({
      where: {
        ...(movementDate ? { movementDate } : {}),
        OR: [
          {
            sourceTankId: tankId,
            sourceTank: { is: { tenantId } },
          },
          {
            destinationTankId: tankId,
            sourceTank: { is: { tenantId } },
          },
        ],
      },
      orderBy: [{ movementDate: 'asc' }, { createdAt: 'asc' }],
      select: tankMovementSelect,
    });

    return { tank, movements };
  }
}
