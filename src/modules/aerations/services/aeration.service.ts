import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { PressureReading } from '@prisma/client';
import { randomBytes } from 'crypto';
import { BaseService } from '../../../common/abstracts/base.service';
import { IngestReadingDto } from '../dto/ingest-reading.dto';
import { AerationsRepository } from '../repositories/aeration.repository';
import { DeviceConnectionRegistry } from '../../../common/device-connection.registry';
import { CreateAerationDto } from '../dto/create-aeration.dto';
import { UpdateBlowerConfigDto } from '../dto/update-aeration.dto';
import { ReadingChartQueryDto, ReadingPeriod } from '../dto/reading-chart-query.dto';

interface AlertCacheEntry {
  lastSaveAt: number;
  lastAlertState: boolean;
  cachedAt: number;
}

const ALERT_CACHE_TTL_MS = 5 * 60 * 1000;
const BUFFER_FLUSH_INTERVAL_MS = 10 * 1000;
const BUFFER_FLUSH_SIZE = 100;



@Injectable()
export class AerationsService
  extends BaseService<
    PressureReading,
    IngestReadingDto,
    Partial<PressureReading>
  >
  implements OnModuleDestroy
{
  private readonly logger = new Logger(AerationsService.name);

  private alertCache = new Map<string, AlertCacheEntry>();

  private readingBuffer: {
    tenant: { connect: { id: string } };
    blowerConfig: { connect: { id: string } };
    psi: number;
    isAlert: boolean;
    deviceTs?: number;
    deviceTime?: Date;
    source: string;
  }[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly aerationsRepository: AerationsRepository,
    private readonly connectionRegistry: DeviceConnectionRegistry,
  ) {
    super(aerationsRepository);
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

  // ==========================================
  // 1. GESTIÓN DE LLAVES Y DISPOSITIVOS (REST)
  // ==========================================

  async provision(tenantId: string, createAerationDto: CreateAerationDto) {
    if (!tenantId) {
      throw new BadRequestException('Token no valido');
    }

    const blowerConfig = await this.aerationsRepository.upsertBlowerConfig(
      tenantId,
      createAerationDto.blowerId,
      { name: createAerationDto.blowerName },
    );

    const key = `blwr_${randomBytes(16).toString('hex')}`;
    const deviceKey = await this.aerationsRepository.createKey(
      key,
      blowerConfig.id,
    );

    return {
      deviceKey: deviceKey.key,
      blowerConfigId: blowerConfig.id,
      blowerId: blowerConfig.blowerId,
      tenantId: blowerConfig.tenantId,
      currentThreshold: blowerConfig.currentThreshold,
    };
  }

  async validateDeviceKey(key: string) {
    const deviceKey = await this.aerationsRepository.findDeviceKey(key);

    if (!deviceKey || !deviceKey.isActive) {
      return null;
    }

    return {
      blowerConfigId: deviceKey.blowerConfig.id,
      blowerId: deviceKey.blowerConfig.blowerId,
      tenantId: deviceKey.blowerConfig.tenantId,
      currentThreshold: deviceKey.blowerConfig.currentThreshold,
      deviceKey: key, // Importante para tu WsConnectionManager
    };
  }

  async listDeviceKeys(tenantId: string) {
    return this.aerationsRepository.findKeysByTenant(tenantId);
  }

  async revokeDeviceKey(key: string, tenantId: string) {
    const existing = await this.aerationsRepository.findDeviceKey(key);

    if (!existing) {
      throw new NotFoundException(`La llave del dispositivo no existe`);
    }

    if (existing.blowerConfig.tenantId !== tenantId) {
      throw new ForbiddenException(
        `La llave del dispositivo no le pertenece a este tenant`,
      );
    }

    const result = await this.aerationsRepository.updateKeyActive(key, false);

    if (existing.blowerConfig.blowerId) {
      this.connectionRegistry.closeByBlowerId(
        existing.blowerConfig.blowerId,
        'key_revoked',
      );
    }

    return result;
  }

  async updateBlowerConfig(
    tenantId: string,
    blowerId: string,
    dto: UpdateBlowerConfigDto,
  ) {
    const blower = await this.aerationsRepository.findBlowerConfig(
      tenantId,
      blowerId,
    );

    if (!blower) {
      throw new NotFoundException(`Blower ${blowerId} no encontrado`);
    }

    if (blower.tenantId !== tenantId) {
      throw new ForbiddenException(`Blower no pertenece a este tenant`);
    }

    const update: { saveIntervalSeconds?: number; scaleFactor?: number } = {};
    if (dto.saveIntervalSeconds !== undefined) {
      update.saveIntervalSeconds = dto.saveIntervalSeconds;
    }
    if (dto.scaleFactor !== undefined) {
      update.scaleFactor = dto.scaleFactor;
    }

    const updated = await this.aerationsRepository.updateConfig(
      blower.id,
      update,
    );

    if (update.scaleFactor !== undefined) {
      this.connectionRegistry.sendToDevice(blowerId, {
        event: 'device_config_update',
        data: { blowerId, scaleFactor: update.scaleFactor },
      });
    }

    return updated;
  }

  async deleteBlower(tenantId: string, blowerId: string) {
    const blower = await this.aerationsRepository.findBlowerConfig(
      tenantId,
      blowerId,
    );

    if (!blower) {
      throw new NotFoundException(`Blower ${blowerId} no encontrado`);
    }

    if (blower.tenantId !== tenantId) {
      throw new ForbiddenException(`Blower no pertenece a este tenant`);
    }

    await this.aerationsRepository.deleteBlowerConfig(blower.id);
    this.connectionRegistry.closeByBlowerId(blowerId, 'device_removed');

    return { message: `Blower ${blowerId} eliminado correctamente` };
  }

  // ==========================================
  // 2. HARDWARE, BUFFER Y TELEMETRÍA (IoT)
  // ==========================================

  async registerBlower(tenantId: string, blowerId: string) {
    return this.aerationsRepository.upsertBlowerConfig(tenantId, blowerId);
  }

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

    const state = await this.aerationsRepository.getAlertState(blowerConfigId);
    this.alertCache.set(blowerConfigId, {
      lastSaveAt: state.lastSaveAt,
      lastAlertState: state.lastAlertState,
      cachedAt: now,
    });
    return {
      lastSaveAt: state.lastSaveAt,
      lastAlertState: state.lastAlertState,
    };
  }

  private async updateCachedAlertState(
    blowerConfigId: string,
    lastSaveAt: Date,
    isAlert: boolean,
  ) {
    await this.aerationsRepository.updateAlertState(
      blowerConfigId,
      lastSaveAt,
      isAlert,
    );
    this.alertCache.set(blowerConfigId, {
      lastSaveAt: lastSaveAt.getTime(),
      lastAlertState: isAlert,
      cachedAt: Date.now(),
    });
  }

  async createReading(ingetReadingDto: IngestReadingDto) { // <-- Cambio clave aquí
    if (!ingetReadingDto.blowerConfigId || !ingetReadingDto.tenantId || !ingetReadingDto.blowerId) {
      this.logger.warn(`Missing required fields: ${JSON.stringify(ingetReadingDto)}`);
      return null;
    }

    const currentThreshold = ingetReadingDto.currentThreshold ?? 2.0;
    const isAlert = ingetReadingDto.psi <= currentThreshold;

    if (ingetReadingDto.currentThreshold !== undefined) {
      await this.aerationsRepository.updateConfig(ingetReadingDto.blowerConfigId, {
        currentThreshold: ingetReadingDto.currentThreshold,
      });
    }

    const { lastSaveAt, lastAlertState } = await this.getCachedAlertState(
      ingetReadingDto.blowerConfigId,
    );

    const now = Date.now();
    const alertChanged = isAlert !== lastAlertState;

    const config = await this.aerationsRepository.getBlowerConfigById(
      ingetReadingDto.blowerConfigId,
    );
    const saveIntervalMs = (config?.saveIntervalSeconds ?? 1800) * 1000;

    if (alertChanged) {
      await this.flushReadingBuffer();

      await this.aerationsRepository.createReading({
        tenant: { connect: { id: ingetReadingDto.tenantId } },
        blowerConfig: { connect: { id: ingetReadingDto.blowerConfigId } },
        psi: ingetReadingDto.psi,
        isAlert,
        deviceTs: ingetReadingDto.deviceTs,
        deviceTime: ingetReadingDto.deviceTime,
        source: 'alert',
      });

      await this.updateCachedAlertState(
        ingetReadingDto.blowerConfigId,
        new Date(now),
        isAlert,
      );

      return { psi: ingetReadingDto.psi, isAlert, source: 'alert' };
    }

    if (now - lastSaveAt >= saveIntervalMs) {
      await this.updateCachedAlertState(
        ingetReadingDto.blowerConfigId,
        new Date(now),
        isAlert,
      );

      this.readingBuffer.push({
        tenant: { connect: { id: ingetReadingDto.tenantId } },
        blowerConfig: { connect: { id: ingetReadingDto.blowerConfigId } },
        psi: ingetReadingDto.psi,
        isAlert,
        deviceTs: ingetReadingDto.deviceTs,
        deviceTime: ingetReadingDto.deviceTime,
        source: 'scheduled',
      });

      if (this.readingBuffer.length >= BUFFER_FLUSH_SIZE) {
        await this.flushReadingBuffer();
      }

      return { psi: ingetReadingDto.psi, isAlert, source: 'scheduled' };
    }

    return null;
  }

  private async flushReadingBuffer() {
    if (this.readingBuffer.length === 0) return;

    const batch = this.readingBuffer.splice(0);
    try {
      await this.aerationsRepository.createManyReadings(
        batch.map((r) => ({
          tenantId: r.tenant.connect.id,
          blowerConfigId: r.blowerConfig.connect.id,
          psi: r.psi,
          isAlert: r.isAlert,
          deviceTs: r.deviceTs,
          deviceTime: r.deviceTime,
          source: r.source,
        })),
      );
      this.logger.debug(`Flushed ${batch.length} pressure readings to DB`);
    } catch (e) {
      this.logger.error(`Failed to flush ${batch.length} readings: ${e}`);
      this.readingBuffer.unshift(...batch);
    }
  }

  // ==========================================
  // 3. CONSULTAS Y GRÁFICAS (REST)
  // ==========================================

  async getLatestThreshold(
    tenantId: string,
    blowerId?: string,
  ): Promise<number> {
    if (blowerId) {
      const config = await this.aerationsRepository.findBlowerConfig(
        tenantId,
        blowerId,
      );
      return config?.currentThreshold ?? 2.0;
    } else {
      const config =
        await this.aerationsRepository.getFirstBlowerConfig(tenantId);
      return config?.currentThreshold ?? 2.0;
    }
  }

  async updateThreshold(tenantId: string, blowerId: string, threshold: number) {
    const config = await this.aerationsRepository.findBlowerConfig(
      tenantId,
      blowerId,
    );
    if (!config) {
      this.logger.warn(
        `BlowerConfig not found: tenantId=${tenantId} blowerId=${blowerId}`,
      );
      return null;
    }
    return this.aerationsRepository.updateConfig(config.id, {
      currentThreshold: threshold,
    });
  }

  async getAllThresholds(
    tenantId: string,
  ): Promise<{ blowerId: string; threshold: number }[]> {
    const configs = await this.aerationsRepository.getAllBlowerConfigs(
      tenantId,
    );
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
    return this.aerationsRepository.updateDeviceMetadata(blowerConfigId, data);
  }

  async updateDeviceConfig(
    blowerConfigId: string,
    data: {
      readIntervalMs?: number;
      scaleFactor?: number;
    },
  ) {
    return this.aerationsRepository.updateConfig(blowerConfigId, data);
  }

  async getBlowerConfigByTenantAndId(tenantId: string, blowerId: string) {
    return this.aerationsRepository.findBlowerConfig(tenantId, blowerId);
  }

  async getBlowerConfigById(blowerConfigId: string) {
    return this.aerationsRepository.getBlowerConfigById(blowerConfigId);
  }

  async getReadingsForChart(tenantId: string, query: ReadingChartQueryDto) {
    const { from, to } = this.getReadingDateRange(query.period);

    const readings =
      await this.aerationsRepository.findPressureReadingsForChart(
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
        const from = new Date(Date.UTC(currentYear, currentMonth, 1));
        const to = new Date(Date.UTC(currentYear, currentMonth + 1, 1));
        return { from, to };
      }
      case ReadingPeriod.YEAR: {
        const from = new Date(Date.UTC(currentYear, 0, 1));
        const to = new Date(Date.UTC(currentYear + 1, 0, 1));
        return { from, to };
      }
      case ReadingPeriod.ALL:
        return { from: undefined, to: undefined };
      case ReadingPeriod.TODAY:
      default: {
        const from = new Date(Date.UTC(currentYear, currentMonth, currentDay));
        const to = new Date(Date.UTC(currentYear, currentMonth, currentDay + 1));
        return { from, to };
      }
    }
  }
}