import { Injectable, Logger } from '@nestjs/common';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { BaseService } from '../../common/abstracts/base.service';
import { SensorsRepository } from './repositories/sensors.repository';
import { PressureReading } from '@prisma/client';
import { ReadingChartQueryDto, ReadingPeriod } from './dto/reading-chart-query.dto';

@Injectable()
export class SensorsService extends BaseService<PressureReading, CreateSensorDto, Partial<PressureReading>> {
  private readonly logger = new Logger(SensorsService.name);

  constructor(private readonly sensorsRepository: SensorsRepository) {
    super(sensorsRepository);
  }

  async registerBlower(tenantId: string, blowerId: string) {
    return this.sensorsRepository.upsertBlowerConfig(tenantId, blowerId);
  }

  async createReading(data: CreateSensorDto) {
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

    if (now - lastSaveAt >= 1800000 || alertChanged) {
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
      uptimeMs?: bigint;
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

  async getReadingsForChart(
    tenantId: string,
    query: ReadingChartQueryDto,
  ) {
    const { from, to } = this.getReadingDateRange(query.period);

    const readings =
      await this.sensorsRepository.findPressureReadingsForChart(
        tenantId,
        query.blowerConfigId,
        from,
        to,
      );

    return readings.map((reading) => ({
      date: reading.createdAt,
      psi: reading.psi,
      isAlert: reading.isAlert,
      blowerId: reading.blowerConfig?.blowerId,
      blowerName: reading.blowerConfig?.name,
    }));
  }

  private getReadingDateRange(period: ReadingPeriod) {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth();
    const currentDay = now.getUTCDate();

    switch (period) {
      case ReadingPeriod.MONTH: {
        const from = new Date(
          Date.UTC(currentYear, currentMonth, 1),
        );

        const to = new Date(
          Date.UTC(currentYear, currentMonth + 1, 1),
        );

        return { from, to };
      }

      case ReadingPeriod.YEAR: {
        const from = new Date(
          Date.UTC(currentYear, 0, 1),
        );

        const to = new Date(
          Date.UTC(currentYear + 1, 0, 1),
        );

        return { from, to };
      }

      case ReadingPeriod.ALL:
        return {
          from: undefined,
          to: undefined,
        };

      case ReadingPeriod.TODAY:
      default: {
        const from = new Date(
          Date.UTC(currentYear, currentMonth, currentDay),
        );

        const to = new Date(
          Date.UTC(currentYear, currentMonth, currentDay + 1),
        );

        return { from, to };
      }
    }
  }
}
