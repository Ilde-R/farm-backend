import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { BaseService } from '../../common/abstracts/base.service';
import { SensorsRepository } from './repositories/sensors.repository';
import { PressureReading } from '@prisma/client';

interface AlertCacheEntry {
  lastSaveAt: number;
  lastAlertState: boolean;
  cachedAt: number;
}

const ALERT_CACHE_TTL_MS = 5 * 60 * 1000;
const BUFFER_FLUSH_INTERVAL_MS = 10 * 1000;
const BUFFER_FLUSH_SIZE = 100;

@Injectable()
export class SensorsService
  extends BaseService<
    PressureReading,
    CreateSensorDto,
    Partial<PressureReading>
  >
  implements OnModuleDestroy
{
  private readonly logger = new Logger(SensorsService.name);

  private alertCache = new Map<string, AlertCacheEntry>();

  private readingBuffer: {
    tenant: { connect: { id: string } };
    blowerConfig: { connect: { id: string } };
    psi: number;
    isAlert: boolean;
  }[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly sensorsRepository: SensorsRepository) {
    super(sensorsRepository);
    this.flushTimer = setInterval(() => {
      this.flushReadingBuffer().catch((e) =>
        this.logger.error(`Buffer flush error: ${e}`),
      );
    }, BUFFER_FLUSH_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushReadingBuffer().catch((e) =>
      this.logger.error(`Shutdown buffer flush error: ${e}`),
    );
  }

  async registerBlower(tenantId: string, blowerId: string) {
    return this.sensorsRepository.upsertBlowerConfig(tenantId, blowerId);
  }

  /**
   * Gets alert state from cache, falling back to DB on miss.
   * Eliminates 1 DB query per pressure reading when cached.
   */
  private async getCachedAlertState(blowerConfigId: string): Promise<{
    lastSaveAt: number;
    lastAlertState: boolean;
  }> {
    const cached = this.alertCache.get(blowerConfigId);
    const now = Date.now();

    if (cached && now - cached.cachedAt < ALERT_CACHE_TTL_MS) {
      return {
        lastSaveAt: cached.lastSaveAt,
        lastAlertState: cached.lastAlertState,
      };
    }

    // Cache miss — fetch from DB
    const state = await this.sensorsRepository.getAlertState(blowerConfigId);
    this.alertCache.set(blowerConfigId, {
      lastSaveAt: state.lastSaveAt,
      lastAlertState: state.lastAlertState,
      cachedAt: now,
    });
    return { lastSaveAt: state.lastSaveAt, lastAlertState: state.lastAlertState };
  }

  /**
   * Updates alert state in both DB and cache.
   */
  private async updateCachedAlertState(
    blowerConfigId: string,
    lastSaveAt: Date,
    isAlert: boolean,
  ) {
    await this.sensorsRepository.updateAlertState(
      blowerConfigId,
      lastSaveAt,
      isAlert,
    );
    // Update cache immediately
    this.alertCache.set(blowerConfigId, {
      lastSaveAt: lastSaveAt.getTime(),
      lastAlertState: isAlert,
      cachedAt: Date.now(),
    });
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

    // Use cached alert state instead of DB query every time
    const { lastSaveAt, lastAlertState } =
      await this.getCachedAlertState(data.blowerConfigId);

    const now = Date.now();
    const alertChanged = isAlert !== lastAlertState;

    // Fetch saveIntervalSeconds fresh from DB (not cached)
    const config = await this.sensorsRepository.getBlowerConfigById(
      data.blowerConfigId,
    );
    const saveIntervalMs = (config?.saveIntervalSeconds ?? 300) * 1000;

    if (now - lastSaveAt >= saveIntervalMs || alertChanged) {
      await this.updateCachedAlertState(
        data.blowerConfigId,
        new Date(now),
        isAlert,
      );

      // Buffer the write instead of immediate DB insert
      this.readingBuffer.push({
        tenant: { connect: { id: data.tenantId } },
        blowerConfig: { connect: { id: data.blowerConfigId } },
        psi: data.psi,
        isAlert: isAlert,
      });

      // Flush if buffer is full
      if (this.readingBuffer.length >= BUFFER_FLUSH_SIZE) {
        await this.flushReadingBuffer();
      }

      return { psi: data.psi, isAlert }; // Return immediately, write is buffered
    }

    return null;
  }

  /**
   * Flushes the reading buffer to DB using batch insert.
   * Converts N individual INSERT queries into 1 createMany query.
   */
  private async flushReadingBuffer() {
    if (this.readingBuffer.length === 0) return;

    const batch = this.readingBuffer.splice(0);
    try {
      await this.sensorsRepository.createManyReadings(
        batch.map((r) => ({
          tenantId: r.tenant.connect.id,
          blowerConfigId: r.blowerConfig.connect.id,
          psi: r.psi,
          isAlert: r.isAlert,
        })),
      );
      this.logger.debug(`Flushed ${batch.length} pressure readings to DB`);
    } catch (e) {
      this.logger.error(`Failed to flush ${batch.length} readings: ${e}`);
      // Put failed items back at the front of the buffer for retry
      this.readingBuffer.unshift(...batch);
    }
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
