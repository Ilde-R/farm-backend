import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../../common/abstracts/base.repository";
import { Tank } from "@prisma/client";
import { UpdateTankDto } from "../dto/update-tank.dto";
import { CreateTankDto } from "../dto/create-tank.dto";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class TankRepository extends BaseRepository<
 Tank,
 CreateTankDto,
 UpdateTankDto
> {
    constructor(private readonly prisma: PrismaService){
        super(prisma.tank)
    }
}