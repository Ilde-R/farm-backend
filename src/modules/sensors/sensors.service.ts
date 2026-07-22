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

  private lastSaveTime: Map<string, number> = new Map();
  private lastAlertState: Map<string, boolean> = new Map();

  async create(data: CreateSensorDto) {
    if (!data.blowerConfigId || !data.tenantId || !data.blowerId) {
      console.error('Faltan datos requeridos. Datos recibidos:', data);
      return null;
    }

    const currentThreshold = data.currentThreshold ?? 2.0;
    const isAlert = data.psi <= currentThreshold;

    if (isAlert) {
      console.log(`¡ALERTA! Soplador perdió presión: ${data.psi} PSI`);
    }

    if (data.currentThreshold !== undefined) {
      await this.sensorsRepository.updateBlowerThreshold(
        data.blowerConfigId,
        data.currentThreshold,
      );
    }

    const now = Date.now();
    const blowerId = data.blowerId;
    const lastSave = this.lastSaveTime.get(blowerId) || 0;
    const lastAlert = this.lastAlertState.get(blowerId) ?? false;

    const alertChanged = isAlert !== lastAlert;

    if (now - lastSave >= 300000 || alertChanged) {
      this.lastSaveTime.set(blowerId, now);
      this.lastAlertState.set(blowerId, isAlert);

      return this.sensorsRepository.createReading({
        tenant: { connect: { id: data.tenantId } },
        blowerConfig: { connect: { id: data.blowerConfigId } },
        psi: data.psi,
        isAlert: isAlert,
      });
    }

    return null;
  }

  async getLatestThreshold(
    tenantId: string,
    blowerId?: string,
  ): Promise<number> {
    if (blowerId) {
      const config = await this.sensorsRepository.getBlowerConfig(
        tenantId,
        blowerId,
      );
      return config?.currentThreshold ?? 2.0;
    } else {
      const config =
        await this.sensorsRepository.getFirstBlowerConfig(tenantId);
      return config?.currentThreshold ?? 2.0;
    }
  }
}
