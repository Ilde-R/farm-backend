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
const device_connection_registry_1 = require("../../common/device-connection.registry");
let IotService = class IotService {
    prisma;
    iotRepository;
    connectionRegistry;
    constructor(prisma, iotRepository, connectionRegistry) {
        this.prisma = prisma;
        this.iotRepository = iotRepository;
        this.connectionRegistry = connectionRegistry;
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
        const result = await this.iotRepository.updateKeyActive(key, false);
        if (existing.blowerConfig.blowerId) {
            this.connectionRegistry.closeByBlowerId(existing.blowerConfig.blowerId, 'key_revoked');
        }
        return result;
    }
    async updateBlowerConfig(tenantId, blowerId, dto) {
        const blower = await this.iotRepository.findBlowerConfig(tenantId, blowerId);
        if (!blower) {
            throw new common_1.NotFoundException(`Blower ${blowerId} no encontrado`);
        }
        if (blower.tenantId !== tenantId) {
            throw new common_1.ForbiddenException(`Blower no pertenece a este tenant`);
        }
        const update = {};
        if (dto.saveIntervalSeconds !== undefined) {
            update.saveIntervalSeconds = dto.saveIntervalSeconds;
        }
        if (dto.scaleFactor !== undefined) {
            update.scaleFactor = dto.scaleFactor;
        }
        const updated = await this.iotRepository.updateBlowerConfig(blower.id, update);
        if (update.scaleFactor !== undefined) {
            this.connectionRegistry.sendToDevice(blowerId, {
                event: 'device_config_update',
                data: { blowerId, scaleFactor: update.scaleFactor },
            });
        }
        return updated;
    }
    async deleteBlower(tenantId, blowerId) {
        const blower = await this.iotRepository.findBlowerConfig(tenantId, blowerId);
        if (!blower) {
            throw new common_1.NotFoundException(`Blower ${blowerId} no encontrado`);
        }
        if (blower.tenantId !== tenantId) {
            throw new common_1.ForbiddenException(`Blower no pertenece a este tenant`);
        }
        await this.iotRepository.deleteBlowerConfig(blower.id);
        this.connectionRegistry.closeByBlowerId(blowerId, 'device_removed');
        return { message: `Blower ${blowerId} eliminado correctamente` };
    }
};
exports.IotService = IotService;
exports.IotService = IotService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        iot_repository_1.IotRepository,
        device_connection_registry_1.DeviceConnectionRegistry])
], IotService);
//# sourceMappingURL=iot.service.js.map