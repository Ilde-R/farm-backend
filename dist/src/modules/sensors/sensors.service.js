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
let SensorsService = SensorsService_1 = class SensorsService extends base_service_1.BaseService {
    sensorsRepository;
    logger = new common_1.Logger(SensorsService_1.name);
    constructor(sensorsRepository) {
        super(sensorsRepository);
        this.sensorsRepository = sensorsRepository;
    }
    async registerBlower(tenantId, blowerId) {
        const config = await this.sensorsRepository.upsertBlowerConfig(tenantId, blowerId);
        this.logger.log(`Blower registered: ${blowerId} → configId: ${config.id}`);
        return config;
    }
    lastSaveTime = new Map();
    lastAlertState = new Map();
    async create(data) {
        if (!data.blowerConfigId || !data.tenantId || !data.blowerId) {
            this.logger.warn(`Missing required fields: ${JSON.stringify(data)}`);
            return null;
        }
        const currentThreshold = data.currentThreshold ?? 2.0;
        const isAlert = data.psi <= currentThreshold;
        if (isAlert) {
            this.logger.warn(`ALERT! Blower lost pressure: ${data.psi} PSI`);
        }
        if (data.currentThreshold !== undefined) {
            await this.sensorsRepository.updateBlowerThreshold(data.blowerConfigId, data.currentThreshold);
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
};
exports.SensorsService = SensorsService;
exports.SensorsService = SensorsService = SensorsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sensors_repository_1.SensorsRepository])
], SensorsService);
//# sourceMappingURL=sensors.service.js.map