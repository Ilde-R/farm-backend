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

  async create(data: CreateSensorDto) {
    if (data.psi < 2.0) {
      console.log(`¡ALERTA! El soplador ${data.blowerId} perdió presión.`);
    }

    if (!data.tenantId || !data.blowerId) {
      // Si no vienen los datos mínimos, no podemos guardarlo
      console.error('Faltan datos de tenantId o blowerId');
      return null;
    }

    // 1. Guardamos/Actualizamos el estado del soplador
    const config = await this.sensorsRepository.upsertBlowerConfig(
      data.tenantId,
      data.blowerId,
      data.currentThreshold,
    );

    // 2. Guardamos solo la lectura histórica
    const readingData = {
      tenantId: data.tenantId,
      blowerConfigId: config.id,
      psi: data.psi,
      isAlert: data.isAlert ?? false,
    };

    return super.create(readingData as any);
  }

  async getLatestThreshold(blowerId?: string): Promise<number> {
    if (blowerId) {
      const config = await this.sensorsRepository.getBlowerConfig(blowerId);
      return config?.currentThreshold ?? 2.0;
    } else {
      const config = await this.sensorsRepository.getFirstBlowerConfig();
      return config?.currentThreshold ?? 2.0;
    }
  }
}
