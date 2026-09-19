import { PartialType } from '@nestjs/swagger';
import { CreateTankDto } from './create-tank.dto';

export class UpdateTankDto extends PartialType(CreateTankDto) {}
