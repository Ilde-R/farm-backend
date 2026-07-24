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
exports.IotService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const crypto_1 = require("crypto");
const iot_repository_1 = require("./repositories/iot.repository");
let IotService = class IotService {
    prisma;
    iotRepository;
    constructor(prisma, iotRepository) {
        this.prisma = prisma;
        this.iotRepository = iotRepository;
    }
    async provision(tenantId, dto) {
        if (!tenantId) {
            throw new common_1.BadRequestException('Token JWT no contiene tenantId válido');
        }
        const tenant = await this.iotRepository.findTenantById(tenantId);
        if (!tenant) {
            throw new common_1.NotFoundException(`Tenant ${tenantId} no encontrado`);
        }
        const blowerConfig = await this.iotRepository.upsertBlowerConfig(tenantId, dto.blowerId, dto.blowerName);
        const key = `blwr_${(0, crypto_1.randomBytes)(16).toString('hex')}`;
        const deviceKey = await this.iotRepository.createKey(key, blowerConfig.id);
        return {
            deviceKey: deviceKey.key,
            blowerConfigId: blowerConfig.id,
            blowerId: blowerConfig.blowerId,
            tenantId: blowerConfig.tenantId,
            currentThreshold: blowerConfig.currentThreshold,
        };
    }
    async validateDeviceKey(key) {
        const deviceKey = await this.iotRepository.findByKeyWithBlower(key);
        if (!deviceKey || !deviceKey.isActive) {
            return null;
        }
        return {
            blowerConfigId: deviceKey.blowerConfig.id,
            blowerId: deviceKey.blowerConfig.blowerId,
            tenantId: deviceKey.blowerConfig.tenantId,
            currentThreshold: deviceKey.blowerConfig.currentThreshold,
        };
    }
    async listDeviceKeys(tenantId) {
        return this.iotRepository.findKeysByTenant(tenantId);
    }
    async revokeDeviceKey(key, tenantId) {
        const existing = await this.iotRepository.findKeyWithTenant(key);
        if (!existing) {
            throw new common_1.NotFoundException(`La llave del dispositivo no existe`);
        }
        if (existing.blowerConfig.tenantId !== tenantId) {
            throw new common_1.ForbiddenException(`La llave del dispositivo no le pertenece a este tenant`);
        }
        return this.iotRepository.updateKeyActive(key, false);
    }
};
exports.IotService = IotService;
exports.IotService = IotService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        iot_repository_1.IotRepository])
], IotService);
//# sourceMappingURL=iot.service.js.map