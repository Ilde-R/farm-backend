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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensorsService = void 0;
const common_1 = require("@nestjs/common");
const base_service_1 = require("../../common/abstracts/base.service");
const sensors_repository_1 = require("./repositories/sensors.repository");
let SensorsService = class SensorsService extends base_service_1.BaseService {
    sensorsRepository;
    constructor(sensorsRepository) {
        super(sensorsRepository);
        this.sensorsRepository = sensorsRepository;
    }
    async registerBlower(tenantId, blowerId) {
        const config = await this.sensorsRepository.upsertBlowerConfig(tenantId, blowerId);
        console.log(`Soplador registrado: ${blowerId} -> configId: ${config.id}`);
        return config;
    }
    lastSaveTime = new Map();
    lastAlertState = new Map();
    async create(data) {
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
    async getLatestThreshold(blowerId) {
        if (blowerId) {
            const config = await this.sensorsRepository.getBlowerConfig(blowerId);
            return config?.currentThreshold ?? 2.0;
        }
        else {
            const config = await this.sensorsRepository.getFirstBlowerConfig();
            return config?.currentThreshold ?? 2.0;
        }
    }
};
exports.SensorsService = SensorsService;
exports.SensorsService = SensorsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sensors_repository_1.SensorsRepository])
], SensorsService);
//# sourceMappingURL=sensors.service.js.map