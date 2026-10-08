import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBatchDto } from '../dto/create-batch.dto';
import { UpdateBatchDto } from '../dto/update-batch.dto';
import { batchSelect, BatchSelect } from '../selects/batch.select';

export type CreateBatchResult =
  | { status: 'not-found' }
  | { status: 'active-batch-exists' }
  | { status: 'created'; batch: BatchSelect };

@Injectable()
export class BatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateBatchDto,
    tenantId: string,
  ): Promise<CreateBatchResult> {
    return this.prisma.$transaction(async (transaction) => {
      const tanks = await transaction.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM tanks
        WHERE id = ${data.tankId}::uuid
          AND "tenantId" = ${tenantId}::uuid
          AND "deletedAt" IS NULL
        FOR UPDATE
      `;
      const tank = tanks[0];

      if (!tank) {
        return { status: 'not-found' };
      }

      const activeBatch = await transaction.batch.findFirst({
        where: {
          tankId: tank.id,
          batchesStatus: 'isActive',
        },
        select: { id: true },
      });

      if (activeBatch) {
        return { status: 'active-batch-exists' };
      }

      const batch = await transaction.batch.create({
        data: {
          ...data,
          currentQuantity: data.initialQuantity,
        },
        select: batchSelect,
      });

      await transaction.tank.update({
        where: { id: tank.id },
        data: { tankStatus: 'isActive' },
      });

      return { status: 'created', batch };
    });
  }

  async harvest(id: string, tenantId: string): Promise<BatchSelect> {
    return this.prisma.$transaction(async (transaction) => {
      const existingBatch = await transaction.batch.findFirst({
        where: {
          id,
          tank: { is: { tenantId } },
        },
        select: { id: true, tankId: true },
      });

      if (!existingBatch?.tankId) {
        throw new NotFoundException('Lote no encontrado o no autorizado');
      }

      await transaction.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM tanks
        WHERE id = ${existingBatch.tankId}::uuid
          AND "tenantId" = ${tenantId}::uuid
        FOR UPDATE
      `;

      const batch = await transaction.batch.findFirst({
        where: {
          id,
          tank: { is: { tenantId } },
        },
        select: {
          id: true,
          tankId: true,
          currentQuantity: true,
          batchesStatus: true,
        },
      });

      if (!batch?.tankId) {
        throw new NotFoundException('Lote no encontrado o no autorizado');
      }

      if (batch.batchesStatus !== 'isActive') {
        throw new ConflictException('El lote ya está cerrado o cosechado.');
      }

      if (batch.currentQuantity !== 0) {
        throw new BadRequestException(
          'No se puede cosechar el lote mientras tenga cantidad disponible; registra primero su venta o transferencia.',
        );
      }

      const updated = await transaction.batch.updateMany({
        where: {
          id: batch.id,
          tankId: batch.tankId,
          batchesStatus: 'isActive',
          currentQuantity: 0,
        },
        data: {
          batchesStatus: 'harvested',
          harvestedDate: new Date(),
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'El lote cambió mientras se procesaba; vuelve a intentarlo.',
        );
      }

      await transaction.tank.update({
        where: { id: batch.tankId },
        data: { tankStatus: 'empty' },
      });

      const harvestedBatch = await transaction.batch.findFirst({
        where: { id: batch.id, tank: { is: { tenantId } } },
        select: batchSelect,
      });

      if (!harvestedBatch) {
        throw new NotFoundException('Lote no encontrado o no autorizado');
      }

      return harvestedBatch;
    });
  }

  async findAll(pagination: PaginationQueryDto, tenantId: string) {
    const { page = 1, limit = 10 } = pagination;
    const where = { tank: { is: { tenantId } } };

    const [items, total] = await Promise.all([
      this.prisma.batch.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: batchSelect,
      }),
      this.prisma.batch.count({ where }),
    ]);

    return { items, total };
  }

  findOne(id: string, tenantId: string): Promise<BatchSelect | null> {
    return this.prisma.batch.findFirst({
      where: { id, tank: { is: { tenantId } } },
      select: batchSelect,
    });
  }

  async update(
    id: string,
    data: UpdateBatchDto,
    tenantId: string,
  ): Promise<BatchSelect | null> {
    if (data.tankId) {
      const tank = await this.prisma.tank.findFirst({
        where: { id: data.tankId, tenantId, deletedAt: null },
        select: { id: true },
      });

      if (!tank) {
        return null;
      }
    }

    const result = await this.prisma.batch.updateMany({
      where: { id, tank: { is: { tenantId } } },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const result = await this.prisma.batch.deleteMany({
      where: { id, tank: { is: { tenantId } } },
    });

    return result.count > 0;
  }
}
