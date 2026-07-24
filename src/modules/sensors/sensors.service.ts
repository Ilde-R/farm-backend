import { Injectable, Logger } from '@nestjs/common';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { BaseService } from '../../common/abstracts/base.service';
import { SensorsRepository } from './repositories/sensors.repository';

@Injectable()
export class SensorsService extends BaseService<any, CreateSensorDto, any> {
  private readonly logger = new Logger(SensorsService.name);

  constructor(private readonly sensorsRepository: SensorsRepository) {
    super(sensorsRepository);
  }

  async registerBlower(tenantId: string, blowerId: string) {
    return this.sensorsRepository.upsertBlowerConfig(tenantId, blowerId);
  }

  async create(data: CreateSensorDto) {
    if (!data.blowerConfigId || !data.tenantId || !data.blowerId) {
      this.logger.warn(`Missing required fields: ${JSON.stringify(data)}`);
      return null;
    }

    const currentThreshold = data.currentThreshold ?? 2.0;
    const isAlert = data.psi <= currentThreshold;

    if (data.currentThreshold !== undefined) {
      await this.sensorsRepository.updateBlowerThreshold(
        data.blowerConfigId,
        data.currentThreshold,
      );
    }

    const { lastSaveAt, lastAlertState } =
      await this.sensorsRepository.getAlertState(data.blowerConfigId);

    const now = Date.now();
    const alertChanged = isAlert !== lastAlertState;

    if (now - lastSaveAt >= 300000 || alertChanged) {
      await this.sensorsRepository.updateAlertState(
        data.blowerConfigId,
        new Date(now),
        isAlert,
      );

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

  async updateThreshold(tenantId: string, blowerId: string, threshold: number) {
    const config = await this.sensorsRepository.getBlowerConfig(
      tenantId,
      blowerId,
    );
    if (!config) {
      this.logger.warn(
        `BlowerConfig not found: tenantId=${tenantId} blowerId=${blowerId}`,
      );
      return null;
    }
    return this.sensorsRepository.updateBlowerThreshold(config.id, threshold);
  }

  async getAllThresholds(
    tenantId: string,
  ): Promise<{ blowerId: string; threshold: number }[]> {
    const configs = await this.sensorsRepository.getAllBlowerConfigs(tenantId);
    return configs.map((c) => ({
      blowerId: c.blowerId,
      threshold: c.currentThreshold,
    }));
  }

  async updateDeviceMetadata(
    blowerConfigId: string,
    data: {
      firmwareVersion?: string;
      wifiRssi?: number;
      uptimeMs?: number;
      freeHeap?: number;
    },
  ) {
    return this.sensorsRepository.updateDeviceMetadata(blowerConfigId, data);
  }

  async updateDeviceConfig(
    blowerConfigId: string,
    data: {
      readIntervalMs?: number;
      scaleFactor?: number;
    },
  ) {
    return this.sensorsRepository.updateDeviceConfig(blowerConfigId, data);
  }

  async getBlowerConfigByTenantAndId(tenantId: string, blowerId: string) {
    return this.sensorsRepository.getBlowerConfig(tenantId, blowerId);
  }

  async getBlowerConfigById(blowerConfigId: string) {
    return this.sensorsRepository.getBlowerConfigById(blowerConfigId);
  }
}
