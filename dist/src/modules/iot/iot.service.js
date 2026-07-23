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
var IotService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IotService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const crypto_1 = require("crypto");
let IotService = IotService_1 = class IotService {
    prisma;
    logger = new common_1.Logger(IotService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async provision(tenantId, dto) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        if (!tenant) {
            throw new common_1.NotFoundException(`Tenant ${tenantId} not found`);
        }
        const blowerConfig = await this.prisma.blowerConfig.upsert({
            where: {
                tenantId_blowerId: {
                    tenantId: tenantId,
                    blowerId: dto.blowerId,
                },
            },
            update: {
                name: dto.blowerName,
            },
            create: {
                blowerId: dto.blowerId,
                name: dto.blowerName,
                tenant: { connect: { id: tenantId } },
                currentThreshold: 2.0,
            },
        });
        const key = `blwr_${(0, crypto_1.randomBytes)(16).toString('hex')}`;
        const deviceKey = await this.prisma.deviceKey.create({
            data: {
                key,
                blowerConfig: { connect: { id: blowerConfig.id } },
            },
        });
        this.logger.log(`Device provisioned: key=${key} → blowerConfigId=${blowerConfig.id}`);
        return {
            deviceKey: deviceKey.key,
            blowerConfigId: blowerConfig.id,
            blowerId: blowerConfig.blowerId,
            tenantId: blowerConfig.tenantId,
            currentThreshold: blowerConfig.currentThreshold,
        };
    }
    async validateDeviceKey(key) {
        const deviceKey = await this.prisma.deviceKey.findUnique({
            where: { key },
            include: {
                blowerConfig: true,
            },
        });
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
        return this.prisma.deviceKey.findMany({
            where: {
                blowerConfig: { tenantId },
            },
            include: {
                blowerConfig: {
                    select: { blowerId: true, name: true },
                },
            },
        });
    }
    async revokeDeviceKey(key) {
        return this.prisma.deviceKey.update({
            where: { key },
            data: { isActive: false },
        });
    }
};
exports.IotService = IotService;
exports.IotService = IotService = IotService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IotService);
//# sourceMappingURL=iot.service.js.map