import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTankDto } from './dto/create-tank.dto';
import { UpdateTankDto } from './dto/update-tank.dto';
import { Tank } from '@prisma/client';
import { BaseService } from '../../common/abstracts/base.service';
import { TankRepository } from './repositories/tank.repository';

@Injectable()
export class TanksService extends BaseService<
  Tank,
  CreateTankDto,
  UpdateTankDto
> {
  constructor(private readonly tankRepository: TankRepository) {
    super(tankRepository);
  }

  async create(createTankDto: CreateTankDto, tenantId: string) {
    const existingTank = await this.tankRepository.findByTankNumber(
      tenantId,
      createTankDto.tankNumber
    );

    if (existingTank) {
      throw new ConflictException(
        `El tanque número ${createTankDto.tankNumber} ya está registrado.`,
      );
    }

    return super.create(createTankDto, tenantId);
  }

  async update(id: string, updateTankDto: UpdateTankDto, tenantId: string) {
    const tank = await this.tankRepository.findOne(id, tenantId);

    if (!tank) {
      throw new NotFoundException('Tanque no encontrado o no autorizado');
    }

    const isActivatingEmptyTank =
      tank.tankStatus === 'empty' && updateTankDto.tankStatus === 'isActive';

    if (
      isActivatingEmptyTank &&
      !(await this.tankRepository.hasActiveBatches(tenantId, id))
    ) {
      throw new ConflictException(
        'No se puede activar un tanque vacío sin un lote activo.',
      );
    }

    return super.update(id, updateTankDto, tenantId);
  }
}