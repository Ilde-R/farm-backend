import { Injectable, NotFoundException } from "@nestjs/common";
import { BaseRepository } from "../../../common/abstracts/base.repository";
import { Tank } from "@prisma/client";
import { UpdateTankDto } from "../dto/update-tank.dto";
import { CreateTankDto } from "../dto/create-tank.dto";
import { PrismaService } from "../../../prisma/prisma.service";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

@Injectable()
export class TankRepository extends BaseRepository<
 Tank,
 CreateTankDto,
 UpdateTankDto
> {
    constructor(private readonly prisma: PrismaService){
        super(prisma.tank)
    }

    async findByTankNumber(tenantId: string, tankNumber: number){
        return this.prisma.tank.findFirst({
            where: {
                tenantId: tenantId,
                tankNumber: tankNumber,
                deletedAt: null,
            },
            select: {
                tankNumber: true
            }
        })
    }

    findAll(pagination: PaginationQueryDto) {
        return super.findAll(pagination, { deletedAt: null });
    }

    findOne(id: string, tenantId: string): Promise<Tank | null> {
        return this.prisma.tank.findFirst({
            where: { id, tenantId, deletedAt: null },
        });
    }

    async update(id: string, tenantId: string, data: UpdateTankDto): Promise<Tank> {
        const result = await this.prisma.tank.updateMany({
            where: { id, tenantId, deletedAt: null },
            data,
        });

        if (result.count === 0) {
            throw new NotFoundException('Tanque no encontrado o no autorizado');
        }

        const tank = await this.findOne(id, tenantId);
        if (!tank) {
            throw new NotFoundException('Tanque no encontrado o no autorizado');
        }

        return tank;
    }

    async remove(id: string, tenantId: string): Promise<void> {
        await this.prisma.tank.updateMany({
            where: { id, tenantId, deletedAt: null },
            data: { deletedAt: new Date() },
        });
    }

    async hasActiveBatches(tenantId:string, tankId: string) {
        const batch = await this.prisma.batch.findFirst({
            where: {
                tankId,
                batchesStatus: 'isActive',
                tank: {
                    is: {tenantId}
                }
            },
            select: {id: true}
        })

        return batch !== null;
    }
}