import { Injectable } from '@nestjs/common';
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
  constructor(private readonly tankRepository: TankRepository){
    super(tankRepository)
  }
}
