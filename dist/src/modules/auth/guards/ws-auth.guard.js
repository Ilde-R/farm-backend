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
exports.WsAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const websockets_1 = require("@nestjs/websockets");
const iot_service_1 = require("../../iot/iot.service");
let WsAuthGuard = class WsAuthGuard {
    jwtService;
    iotService;
    constructor(jwtService, iotService) {
        this.jwtService = jwtService;
        this.iotService = iotService;
    }
    async canActivate(context) {
        const client = context.switchToWs().getClient();
        const req = client.upgradeReq;
        if (!req) {
            throw new websockets_1.WsException('No upgrade request available');
        }
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const token = url.searchParams.get('token');
        const deviceKey = (url.searchParams.get('key') || req.headers['key']);
        if (!token && !deviceKey) {
            throw new websockets_1.WsException('Token o device key no proporcionado');
        }
        if (deviceKey) {
            const device = await this.iotService.validateDeviceKey(deviceKey);
            if (!device) {
                throw new websockets_1.WsException('Device key inválido o inactivo');
            }
            client.device = device;
            return true;
        }
        if (token) {
            try {
                const payload = await this.jwtService.verifyAsync(token);
                client.user = payload;
                return true;
            }
            catch {
                throw new websockets_1.WsException('Token inválido o expirado');
            }
        }
        return false;
    }
};
exports.WsAuthGuard = WsAuthGuard;
exports.WsAuthGuard = WsAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        iot_service_1.IotService])
], WsAuthGuard);
//# sourceMappingURL=ws-auth.guard.js.map