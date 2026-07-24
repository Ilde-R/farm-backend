"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const user_repository_1 = require("./repositories/user.repository");
const base_service_1 = require("../../common/abstracts/base.service");
let UsersService = class UsersService extends base_service_1.BaseService {
    userRepository;
    constructor(userRepository) {
        super(userRepository);
        this.userRepository = userRepository;
    }
    async findByTenant(tenantId) {
        return this.userRepository.findByTenant(tenantId);
    }
    async getProfile(userId) {
        const user = await this.userRepository.findOne(userId);
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        return user;
    }
    async updateProfile(userId, updateProfileDto) {
        if (updateProfileDto.email) {
            const existing = await this.userRepository.findByEmail(updateProfileDto.email);
            if (existing && existing.id !== userId) {
                throw new common_1.ConflictException('El email ya esta en uso');
            }
        }
        return this.userRepository.updateProfile(userId, updateProfileDto);
    }
    async changePassword(userId, changePasswordDto) {
        const credential = await this.userRepository.findCredentialByUserId(userId);
        if (!credential) {
            throw new common_1.NotFoundException('Credenciales no encontradas');
        }
        const isValid = await bcrypt.compare(changePasswordDto.currentPassword, changePasswordDto.newPassword);
        if (!isValid) {
            throw new common_1.UnauthorizedException('El password es incorrecto');
        }
        const salt = await bcrypt.genSalt();
        const hash = await bcrypt.hash(changePasswordDto.newPassword, salt);
        await this.userRepository.updateCredentialPassword(userId, hash);
        return { message: 'Password actualizado correctamente' };
    }
    async deleteAccount(userId) {
        const result = await this.userRepository.deleteUserWithTenant(userId);
        if (!result) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        return {
            message: 'Cuenta eliminada correctamente',
            deletedUserId: result.deletedUserId,
            deletedTenantId: result.deletedTenantId,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_repository_1.UserRepository])
], UsersService);
//# sourceMappingURL=users.service.js.map