"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SensorsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensorsService = void 0;
const common_1 = require("@nestjs/common");
const base_service_1 = require("../../common/abstracts/base.service");
const sensors_repository_1 = require("./repositories/sensors.repository");
const ALERT_CACHE_TTL_MS = 5 * 60 * 1000;
const BUFFER_FLUSH_INTERVAL_MS = 10 * 1000;
const BUFFER_FLUSH_SIZE = 100;
let SensorsService = SensorsService_1 = class SensorsService extends base_service_1.BaseService {
    sensorsRepository;
    logger = new common_1.Logger(SensorsService_1.name);
    alertCache = new Map();
    readingBuffer = [];
    flushTimer = null;
    constructor(sensorsRepository) {
        super(sensorsRepository);
        this.sensorsRepository = sensorsRepository;
        this.flushTimer = setInterval(() => {
            this.flushReadingBuffer().catch((e) => this.logger.error(`Buffer flush error: ${e}`));
        }, BUFFER_FLUSH_INTERVAL_MS);
    }
    onModuleDestroy() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        this.flushReadingBuffer().catch((e) => this.logger.error(`Shutdown buffer flush error: ${e}`));
    }
    async registerBlower(tenantId, blowerId) {
        return this.sensorsRepository.upsertBlowerConfig(tenantId, blowerId);
    }
    async getCachedAlertState(blowerConfigId) {
        const cached = this.alertCache.get(blowerConfigId);
        const now = Date.now();
        if (cached && now - cached.cachedAt < ALERT_CACHE_TTL_MS) {
            return {
                lastSaveAt: cached.lastSaveAt,
                lastAlertState: cached.lastAlertState,
                saveIntervalSeconds: cached.saveIntervalSeconds,
            };
        }
        const state = await this.sensorsRepository.getAlertState(blowerConfigId);
        this.alertCache.set(blowerConfigId, {
            lastSaveAt: state.lastSaveAt,
            lastAlertState: state.lastAlertState,
            saveIntervalSeconds: state.saveIntervalSeconds,
            cachedAt: now,
        });
        return state;
    }
    async updateCachedAlertState(blowerConfigId, lastSaveAt, isAlert, saveIntervalSeconds) {
        await this.sensorsRepository.updateAlertState(blowerConfigId, lastSaveAt, isAlert);
        const existing = this.alertCache.get(blowerConfigId);
        this.alertCache.set(blowerConfigId, {
            lastSaveAt: lastSaveAt.getTime(),
            lastAlertState: isAlert,
            saveIntervalSeconds: saveIntervalSeconds ?? existing?.saveIntervalSeconds ?? 300,
            cachedAt: Date.now(),
        });
    }
    async createReading(data) {
        if (!data.blowerConfigId || !data.tenantId || !data.blowerId) {
            this.logger.warn(`Missing required fields: ${JSON.stringify(data)}`);
            return null;
        }
        const currentThreshold = data.currentThreshold ?? 2.0;
        const isAlert = data.psi <= currentThreshold;
        if (data.currentThreshold !== undefined) {
            await this.sensorsRepository.updateBlowerThreshold(data.blowerConfigId, data.currentThreshold);
        }
        const { lastSaveAt, lastAlertState, saveIntervalSeconds } = await this.getCachedAlertState(data.blowerConfigId);
        const now = Date.now();
        const alertChanged = isAlert !== lastAlertState;
        const saveIntervalMs = saveIntervalSeconds * 1000;
        if (now - lastSaveAt >= saveIntervalMs || alertChanged) {
            await this.updateCachedAlertState(data.blowerConfigId, new Date(now), isAlert);
            this.readingBuffer.push({
                tenant: { connect: { id: data.tenantId } },
                blowerConfig: { connect: { id: data.blowerConfigId } },
                psi: data.psi,
                isAlert: isAlert,
            });
            if (this.readingBuffer.length >= BUFFER_FLUSH_SIZE) {
                await this.flushReadingBuffer();
            }
            return { psi: data.psi, isAlert };
        }
        return null;
    }
    async flushReadingBuffer() {
        if (this.readingBuffer.length === 0)
            return;
        const batch = this.readingBuffer.splice(0);
        try {
            await this.sensorsRepository.createManyReadings(batch.map((r) => ({
                tenantId: r.tenant.connect.id,
                blowerConfigId: r.blowerConfig.connect.id,
                psi: r.psi,
                isAlert: r.isAlert,
            })));
            this.logger.debug(`Flushed ${batch.length} pressure readings to DB`);
        }
        catch (e) {
            this.logger.error(`Failed to flush ${batch.length} readings: ${e}`);
            this.readingBuffer.unshift(...batch);
        }
    }
    async getLatestThreshold(tenantId, blowerId) {
        if (blowerId) {
            const config = await this.sensorsRepository.getBlowerConfig(tenantId, blowerId);
            return config?.currentThreshold ?? 2.0;
        }
        else {
            const config = await this.sensorsRepository.getFirstBlowerConfig(tenantId);
            return config?.currentThreshold ?? 2.0;
        }
    }
    async updateThreshold(tenantId, blowerId, threshold) {
        const config = await this.sensorsRepository.getBlowerConfig(tenantId, blowerId);
        if (!config) {
            this.logger.warn(`BlowerConfig not found: tenantId=${tenantId} blowerId=${blowerId}`);
            return null;
        }
        return this.sensorsRepository.updateBlowerThreshold(config.id, threshold);
    }
    async getAllThresholds(tenantId) {
        const configs = await this.sensorsRepository.getAllBlowerConfigs(tenantId);
        return configs.map((c) => ({
            blowerId: c.blowerId,
            threshold: c.currentThreshold,
        }));
    }
    async updateDeviceMetadata(blowerConfigId, data) {
        return this.sensorsRepository.updateDeviceMetadata(blowerConfigId, data);
    }
    async updateDeviceConfig(blowerConfigId, data) {
        return this.sensorsRepository.updateDeviceConfig(blowerConfigId, data);
    }
    async getBlowerConfigByTenantAndId(tenantId, blowerId) {
        return this.sensorsRepository.getBlowerConfig(tenantId, blowerId);
    }
    async getBlowerConfigById(blowerConfigId) {
        return this.sensorsRepository.getBlowerConfigById(blowerConfigId);
    }
};
exports.SensorsService = SensorsService;
exports.SensorsService = SensorsService = SensorsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sensors_repository_1.SensorsRepository])
], SensorsService);
//# sourceMappingURL=sensors.service.js.map