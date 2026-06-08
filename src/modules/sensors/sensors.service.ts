import { Injectable } from '@nestjs/common';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { BaseService } from '../../common/abstracts/base.service';
import { SensorsRepository } from './repositories/sensors.repository';

@Injectable()
export class SensorsService extends BaseService<
  any,
  CreateSensorDto,
  UpdateSensorDto
> {
  constructor(private readonly sensorsRepository: SensorsRepository) {
    super(sensorsRepository);
  }


  async checkBlowerPressure(data: CreateSensorDto) {
    if (data.psi < 2.0) {
      console.log(`¡ALERTA! El soplador ${data.blowerId} perdió presión.`);
    }

    return super.create(data);
  }
}
