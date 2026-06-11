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

  async registerBlower(tenantId: string, blowerId: string) {
    const config = await this.sensorsRepository.upsertBlowerConfig(
      tenantId,
      blowerId,
    );
    console.log(`Soplador registrado: ${blowerId} -> configId: ${config.id}`);
    return config;
  }

  async create(data: CreateSensorDto) {
    if (!data.blowerConfigId || !data.tenantId) {
      console.error('Faltan datos de blowerConfigId o tenantId. Datos recibidos:', data);
      return null;
    }

    if (data.psi < (data.currentThreshold ?? 2.0)) {
      console.log(`¡ALERTA! Soplador perdió presión: ${data.psi} PSI`);
    }

    if (data.currentThreshold !== undefined && data.blowerId) {
      await this.sensorsRepository.updateBlowerThreshold(
        data.blowerConfigId,
        data.currentThreshold,
      );
    }

    return this.sensorsRepository.createReading({
      tenant: { connect: { id: data.tenantId } },
      blowerConfig: { connect: { id: data.blowerConfigId } },
      psi: data.psi,
      isAlert: data.isAlert ?? false,
    });
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
