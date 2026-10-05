import { Injectable } from '@nestjs/common';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBatchDto } from '../dto/create-batch.dto';
import { UpdateBatchDto } from '../dto/update-batch.dto';
import { batchSelect, BatchSelect } from '../selects/batch.select';

@Injectable()
export class BatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateBatchDto,
    tenantId: string,
  ): Promise<BatchSelect | null> {
    const tank = await this.prisma.tank.findFirst({
      where: { id: data.tankId, tenantId },
      select: { id: true },
    });

    if (!tank) {
      return null;
    }

    return this.prisma.batch.create({
      data: {
        ...data,
        currentQuantity: data.initialQuantity,
      },
      select: batchSelect,
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
        where: { id: data.tankId, tenantId },
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
