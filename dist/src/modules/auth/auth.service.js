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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const auth_repository_1 = require("./repositories/auth.repository");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
let AuthService = class AuthService {
    authRepository;
    jwtService;
    prisma;
    constructor(authRepository, jwtService, prisma) {
        this.authRepository = authRepository;
        this.jwtService = jwtService;
        this.prisma = prisma;
    }
    async register(registerDto) {
        const exist = await this.authRepository.findForLogin(registerDto.email);
        if (exist)
            throw new common_1.ConflictException('Email already exists');
        const salt = await bcrypt.genSalt();
        const { password, ...userData } = registerDto;
        const hash = await bcrypt.hash(password, salt);
        const tenant = await this.prisma.tenant.create({
            data: { name: registerDto.username },
        });
        const user = await this.authRepository.register({ ...userData, tenant: { connect: { id: tenant.id } } }, hash);
        const refreshToken = (0, crypto_1.randomBytes)(64).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await this.authRepository.createSession(user.id, refreshToken, expiresAt);
        const payload = { sub: user.id, email: user.email, tenantId: tenant.id };
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            tenantId: tenant.id,
            access_token: this.jwtService.sign(payload),
            refresh_token: refreshToken,
        };
    }
    async login(loginDto) {
        const user = await this.authRepository.findForLogin(loginDto.email);
        if (!user || !user.credential)
            throw new common_1.UnauthorizedException('Credentials not valid');
        const valid = await bcrypt.compare(loginDto.password, user.credential.password);
        if (!valid)
            throw new common_1.UnauthorizedException('Credentials not valid');
        const refreshToken = (0, crypto_1.randomBytes)(64).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await this.authRepository.createSession(user.id, refreshToken, expiresAt);
        const payload = {
            sub: user.id,
            email: user.email,
            tenantId: user.tenantId,
        };
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            tenantId: user.tenantId,
            access_token: this.jwtService.sign(payload),
            refresh_token: refreshToken,
        };
    }
    async refresh(refreshToken) {
        const session = await this.authRepository.findSession(refreshToken.refreshToken);
        if (!session ||
            !session.isActive ||
            (session.expiresAt && session.expiresAt < new Date())) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        await this.authRepository.invalidateSession(refreshToken.refreshToken);
        const user = await this.prisma.user.findUnique({
            where: { id: session.userId },
        });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const newRefreshToken = (0, crypto_1.randomBytes)(64).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await this.authRepository.createSession(user.id, newRefreshToken, expiresAt);
        const payload = {
            sub: user.id,
            email: user.email,
            tenantId: user.tenantId,
        };
        return {
            access_token: this.jwtService.sign(payload),
            refresh_token: newRefreshToken,
        };
    }
    async logout(userId) {
        await this.authRepository.invalidateAllUserSessions(userId);
        return { message: 'Logged out successfully' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_repository_1.AuthRepository,
        jwt_1.JwtService,
        prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map