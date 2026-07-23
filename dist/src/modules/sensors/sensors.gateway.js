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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var SensorsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensorsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const sensors_service_1 = require("./sensors.service");
const ws_1 = require("ws");
const ws_2 = __importDefault(require("ws"));
const ws_auth_guard_1 = require("../auth/guards/ws-auth.guard");
function getClientInfo(client) {
    const device = client.device;
    if (device) {
        return {
            tenantId: device.tenantId,
            blowerId: device.blowerId,
            blowerConfigId: device.blowerConfigId,
        };
    }
    const user = client.user;
    if (user) {
        return { tenantId: user.tenantId };
    }
    return undefined;
}
let SensorsGateway = SensorsGateway_1 = class SensorsGateway {
    sensorsService;
    logger = new common_1.Logger(SensorsGateway_1.name);
    server;
    connectedClients = new Map();
    constructor(sensorsService) {
        this.sensorsService = sensorsService;
    }
    handleConnection(client) {
        const info = getClientInfo(client);
        if (info) {
            this.connectedClients.set(client, info);
            this.logger.log(`Client connected: ${info.blowerId || info.tenantId}`);
        }
    }
    handleDisconnect(client) {
        const info = this.connectedClients.get(client);
        if (info) {
            this.logger.log(`Client disconnected: ${info.blowerId || info.tenantId}`);
        }
        this.connectedClients.delete(client);
    }
    async handleRegisterBlower(data, client) {
        try {
            const clientInfo = this.connectedClients.get(client);
            const tenantId = data.tenantId || clientInfo?.tenantId;
            const blowerId = data.blowerId || clientInfo?.blowerId;
            if (!tenantId || !blowerId) {
                return { status: 'error', message: 'tenantId and blowerId required' };
            }
            this.logger.log(`Registration requested: blowerId=${blowerId}`);
            const config = await this.sensorsService.registerBlower(tenantId, blowerId);
            if (clientInfo) {
                clientInfo.blowerConfigId = config.id;
                clientInfo.blowerId = blowerId;
            }
            client.send(JSON.stringify({
                event: 'blower_registered',
                data: {
                    blowerConfigId: config.id,
                    currentThreshold: config.currentThreshold,
                },
            }));
        }
        catch (error) {
            this.logger.error(`Registration error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }
    async handlePressureReading(data, client) {
        try {
            const clientInfo = this.connectedClients.get(client);
            const enriched = {
                psi: data.psi ?? 0,
                blowerConfigId: data.blowerConfigId || clientInfo?.blowerConfigId,
                tenantId: data.tenantId || clientInfo?.tenantId,
                blowerId: data.blowerId || clientInfo?.blowerId,
            };
            this.logger.debug(`Pressure reading: blowerId=${enriched.blowerId} psi=${enriched.psi}`);
            const record = await this.sensorsService.create(enriched);
            for (const [c] of this.connectedClients) {
                if (c.readyState === ws_2.default.OPEN) {
                    c.send(JSON.stringify({
                        event: 'pressure_reading',
                        data: enriched,
                    }));
                }
            }
            return record;
        }
        catch (error) {
            this.logger.error(`Pressure reading error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }
    async handleSetNewThreshold(data, client) {
        const clientInfo = this.connectedClients.get(client);
        const blowerId = data.blowerId || clientInfo?.blowerId;
        const tenantId = clientInfo?.tenantId;
        if (!blowerId || !tenantId) {
            return { status: 'error', message: 'blowerId required' };
        }
        await this.sensorsService.updateThreshold(tenantId, blowerId, data.threshold);
        for (const [c, info] of this.connectedClients) {
            if (c.readyState === ws_2.default.OPEN && info.blowerId === blowerId) {
                c.send(JSON.stringify({
                    event: 'update_threshold',
                    data: { threshold: data.threshold, blowerId },
                }));
            }
        }
        return { status: 'success', threshold: data.threshold, blowerId };
    }
    async handleGetThreshold(data, client) {
        const clientInfo = this.connectedClients.get(client);
        const tenantId = clientInfo?.tenantId;
        const blowerId = data?.blowerId || clientInfo?.blowerId;
        if (!tenantId) {
            return { status: 'error', message: 'tenantId required' };
        }
        const threshold = await this.sensorsService.getLatestThreshold(tenantId, blowerId);
        client.send(JSON.stringify({
            event: 'current_threshold',
            data: { threshold, blowerId },
        }));
    }
    handleCurrentThreshold(data) {
        for (const [client] of this.connectedClients) {
            if (client.readyState === ws_2.default.OPEN) {
                client.send(JSON.stringify({ event: 'current_threshold', data }));
            }
        }
    }
};
exports.SensorsGateway = SensorsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", ws_1.Server)
], SensorsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('register_blower'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ws_2.default]),
    __metadata("design:returntype", Promise)
], SensorsGateway.prototype, "handleRegisterBlower", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('pressure_reading'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ws_2.default]),
    __metadata("design:returntype", Promise)
], SensorsGateway.prototype, "handlePressureReading", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('set_new_threshold'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ws_2.default]),
    __metadata("design:returntype", Promise)
], SensorsGateway.prototype, "handleSetNewThreshold", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('get_threshold'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ws_2.default]),
    __metadata("design:returntype", Promise)
], SensorsGateway.prototype, "handleGetThreshold", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('current_threshold'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SensorsGateway.prototype, "handleCurrentThreshold", null);
exports.SensorsGateway = SensorsGateway = SensorsGateway_1 = __decorate([
    (0, common_1.UseGuards)(ws_auth_guard_1.WsAuthGuard),
    (0, websockets_1.WebSocketGateway)(),
    __metadata("design:paramtypes", [sensors_service_1.SensorsService])
], SensorsGateway);
//# sourceMappingURL=sensors.gateway.js.map