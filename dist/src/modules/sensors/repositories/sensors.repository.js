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
exports.SensorsRepository = void 0;
const common_1 = require("@nestjs/common");
const base_repository_1 = require("../../../common/abstracts/base.repository");
const prisma_service_1 = require("../../../prisma/prisma.service");
let SensorsRepository = class SensorsRepository extends base_repository_1.BaseRepository {
    prisma;
    constructor(prisma) {
        super(prisma.pressureReading);
        this.prisma = prisma;
    }
    async upsertBlowerConfig(tenantId, blowerId, currentThreshold) {
        return this.prisma.blowerConfig.upsert({
            where: {
                tenantId_blowerId: {
                    tenantId,
                    blowerId,
                },
            },
            update: {},
            create: {
                blowerId,
                tenant: { connect: { id: tenantId } },
                currentThreshold: currentThreshold ?? 2.0,
            },
        });
    }
    async updateBlowerThreshold(blowerConfigId, threshold) {
        return this.prisma.blowerConfig.update({
            where: { id: blowerConfigId },
            data: { currentThreshold: threshold },
        });
    }
    async getBlowerConfig(tenantId, blowerId) {
        return this.prisma.blowerConfig.findUnique({
            where: {
                tenantId_blowerId: {
                    tenantId,
                    blowerId,
                },
            },
        });
    }
    async getFirstBlowerConfig(tenantId) {
        return this.prisma.blowerConfig.findFirst({
            where: { tenantId },
        });
    }
    async getAllBlowerConfigs(tenantId) {
        return this.prisma.blowerConfig.findMany({ where: { tenantId } });
    }
    async updateDeviceMetadata(blowerConfigId, data) {
        return this.prisma.blowerConfig.update({
            where: { id: blowerConfigId },
            data,
        });
    }
    async updateDeviceConfig(blowerConfigId, data) {
        return this.prisma.blowerConfig.update({
            where: { id: blowerConfigId },
            data,
        });
    }
    async getBlowerConfigById(blowerConfigId) {
        return this.prisma.blowerConfig.findUnique({
            where: { id: blowerConfigId },
        });
    }
    async createReading(data) {
        return this.prisma.pressureReading.create({ data });
    }
};
exports.SensorsRepository = SensorsRepository;
exports.SensorsRepository = SensorsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SensorsRepository);
//# sourceMappingURL=sensors.repository.js.map