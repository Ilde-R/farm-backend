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
const reading_chart_query_dto_1 = require("./dto/reading-chart-query.dto");
let SensorsService = SensorsService_1 = class SensorsService extends base_service_1.BaseService {
    sensorsRepository;
    logger = new common_1.Logger(SensorsService_1.name);
    constructor(sensorsRepository) {
        super(sensorsRepository);
        this.sensorsRepository = sensorsRepository;
    }
    async registerBlower(tenantId, blowerId) {
        return this.sensorsRepository.upsertBlowerConfig(tenantId, blowerId);
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
        const { lastSaveAt, lastAlertState } = await this.sensorsRepository.getAlertState(data.blowerConfigId);
        const now = Date.now();
        const alertChanged = isAlert !== lastAlertState;
        if (now - lastSaveAt >= 1800000 || alertChanged) {
            await this.sensorsRepository.updateAlertState(data.blowerConfigId, new Date(now), isAlert);
            return this.sensorsRepository.createReading({
                tenant: { connect: { id: data.tenantId } },
                blowerConfig: { connect: { id: data.blowerConfigId } },
                psi: data.psi,
                isAlert: isAlert,
            });
        }
        return null;
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
    async getReadingsForChart(tenantId, query) {
        const { from, to } = this.getReadingDateRange(query.period);
        const readings = await this.sensorsRepository.findPressureReadingsForChart(tenantId, query.blowerConfigId, from, to);
        return readings.map((reading) => ({
            date: reading.createdAt,
            psi: reading.psi,
            isAlert: reading.isAlert,
            blowerId: reading.blowerConfig?.blowerId,
            blowerName: reading.blowerConfig?.name,
        }));
    }
    getReadingDateRange(period) {
        const now = new Date();
        const currentYear = now.getUTCFullYear();
        const currentMonth = now.getUTCMonth();
        const currentDay = now.getUTCDate();
        switch (period) {
            case reading_chart_query_dto_1.ReadingPeriod.MONTH: {
                const from = new Date(Date.UTC(currentYear, currentMonth, 1));
                const to = new Date(Date.UTC(currentYear, currentMonth + 1, 1));
                return { from, to };
            }
            case reading_chart_query_dto_1.ReadingPeriod.YEAR: {
                const from = new Date(Date.UTC(currentYear, 0, 1));
                const to = new Date(Date.UTC(currentYear + 1, 0, 1));
                return { from, to };
            }
            case reading_chart_query_dto_1.ReadingPeriod.ALL:
                return {
                    from: undefined,
                    to: undefined,
                };
            case reading_chart_query_dto_1.ReadingPeriod.TODAY:
            default: {
                const from = new Date(Date.UTC(currentYear, currentMonth, currentDay));
                const to = new Date(Date.UTC(currentYear, currentMonth, currentDay + 1));
                return { from, to };
            }
        }
    }
};
exports.SensorsService = SensorsService;
exports.SensorsService = SensorsService = SensorsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sensors_repository_1.SensorsRepository])
], SensorsService);
//# sourceMappingURL=sensors.service.js.map