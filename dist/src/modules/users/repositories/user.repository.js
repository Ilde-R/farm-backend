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
exports.UserRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const base_repository_1 = require("../../../common/abstracts/base.repository");
const user_select_1 = require("../selects/user.select");
let UserRepository = class UserRepository extends base_repository_1.BaseRepository {
    prisma;
    constructor(prisma) {
        super(prisma.user, user_select_1.userSelect);
        this.prisma = prisma;
    }
    async findByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email },
            select: user_select_1.userSelect,
        });
    }
    async findByTenant(tenantId) {
        return this.prisma.user.findMany({
            where: { tenantId },
            select: user_select_1.userSelect,
        });
    }
    async findCredentialByUserId(userId) {
        return this.prisma.credential.findUnique({
            where: { userId },
        });
    }
    async updateCredentialPassword(userId, hashedPassword) {
        return this.prisma.credential.update({
            where: { userId },
            data: { password: hashedPassword },
        });
    }
    async updateProfile(userId, data) {
        return this.prisma.user.update({
            where: { id: userId },
            data,
            select: user_select_1.userSelect,
        });
    }
    async deleteUserWithTenant(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                tenantId: true,
            },
        });
        if (!user)
            return null;
        await this.prisma.user.delete({
            where: { id: userId },
        });
        return {
            deletedUserId: userId,
            deletedTenantId: user.tenantId,
        };
    }
};
exports.UserRepository = UserRepository;
exports.UserRepository = UserRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UserRepository);
//# sourceMappingURL=user.repository.js.map